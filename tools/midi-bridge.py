#!/usr/bin/env python3
"""MIDI bridge for Safari (and any browser without Web MIDI).

Reads every MIDI controller on this Mac through macOS' own CoreMIDI and passes the messages to the
Accidental Graphics apps over a local WebSocket. It also serves the site from this folder, so in
Safari you open http://localhost:8765/apps/Isolation/ and MIDI Learn works as in Chrome.

Start it in Terminal from the site folder and leave the window open while you play:

    python3 tools/midi-bridge.py

Nothing to install: it only uses Python's standard library. Everything stays on this computer
(it listens on 127.0.0.1 only). Stop it with Ctrl+C.
"""

import argparse
import base64
import ctypes
import functools
import hashlib
import http.server
import json
import os
import platform
import struct
import sys
import threading

DEFAULT_PORT = 8765
SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEBSOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"


# --- WebSocket clients -------------------------------------------------------------------------

class Clients:
    def __init__(self):
        self.lock = threading.Lock()
        self.items = set()

    def add(self, client):
        with self.lock:
            self.items.add(client)

    def remove(self, client):
        with self.lock:
            self.items.discard(client)

    def send_all(self, text):
        with self.lock:
            targets = list(self.items)
        for client in targets:
            client.send_text(text)


CLIENTS = Clients()


class WebSocketClient:
    def __init__(self, connection):
        self.connection = connection
        self.lock = threading.Lock()
        self.open = True

    def send_frame(self, opcode, payload):
        header = bytes([0x80 | opcode])
        length = len(payload)
        if length < 126:
            header += bytes([length])
        elif length < 65536:
            header += bytes([126]) + struct.pack(">H", length)
        else:
            header += bytes([127]) + struct.pack(">Q", length)
        with self.lock:
            if not self.open:
                return
            try:
                self.connection.sendall(header + payload)
            except OSError:
                self.open = False

    def send_text(self, text):
        self.send_frame(0x1, text.encode("utf-8"))

    def read_frame(self):
        head = self._read(2)
        opcode = head[0] & 0x0F
        masked = head[1] & 0x80
        length = head[1] & 0x7F
        if length == 126:
            length = struct.unpack(">H", self._read(2))[0]
        elif length == 127:
            length = struct.unpack(">Q", self._read(8))[0]
        mask = self._read(4) if masked else b"\0\0\0\0"
        data = bytearray(self._read(length))
        for index in range(length):
            data[index] ^= mask[index % 4]
        return opcode, bytes(data)

    def _read(self, size):
        chunks = b""
        while len(chunks) < size:
            chunk = self.connection.recv(size - len(chunks))
            if not chunk:
                raise ConnectionError("closed")
            chunks += chunk
        return chunks


# --- CoreMIDI ------------------------------------------------------------------------------------

class CoreMidiInput:
    """Listens to all MIDI sources; new controllers are picked up while running."""

    READ_PROC = ctypes.CFUNCTYPE(None, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p)

    def __init__(self, on_message):
        self.on_message = on_message
        self.midi = ctypes.cdll.LoadLibrary("/System/Library/Frameworks/CoreMIDI.framework/CoreMIDI")
        self.cf = ctypes.cdll.LoadLibrary("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation")
        self.midi.MIDIGetNumberOfSources.restype = ctypes.c_ulong
        self.midi.MIDIGetSource.restype = ctypes.c_uint32
        self.midi.MIDIGetSource.argtypes = [ctypes.c_ulong]
        self.midi.MIDIClientCreate.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.POINTER(ctypes.c_uint32)]
        self.midi.MIDIInputPortCreate.argtypes = [ctypes.c_uint32, ctypes.c_void_p, self.READ_PROC, ctypes.c_void_p, ctypes.POINTER(ctypes.c_uint32)]
        self.midi.MIDIPortConnectSource.argtypes = [ctypes.c_uint32, ctypes.c_uint32, ctypes.c_void_p]
        self.midi.MIDIObjectGetStringProperty.argtypes = [ctypes.c_uint32, ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p)]
        self.cf.CFStringCreateWithCString.restype = ctypes.c_void_p
        self.cf.CFStringCreateWithCString.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_uint32]
        self.cf.CFStringGetCString.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_long, ctypes.c_uint32]
        self.cf.CFRelease.argtypes = [ctypes.c_void_p]
        self.cf.CFRunLoopRunInMode.argtypes = [ctypes.c_void_p, ctypes.c_double, ctypes.c_bool]
        self.run_loop_mode = ctypes.c_void_p.in_dll(self.cf, "kCFRunLoopDefaultMode")
        self.display_name = ctypes.c_void_p.in_dll(self.midi, "kMIDIPropertyDisplayName")
        self.arm = platform.machine() == "arm64"
        self.connected = set()
        self.running_status = {}

        self.client = ctypes.c_uint32()
        self.port = ctypes.c_uint32()
        name = self._cfstring("Accidental Graphics MIDI bridge")
        self._check(self.midi.MIDIClientCreate(name, None, None, ctypes.byref(self.client)), "create client")
        # Keep a reference so the callback is not garbage collected.
        self.read_proc = self.READ_PROC(self._read)
        port_name = self._cfstring("Input")
        self._check(self.midi.MIDIInputPortCreate(self.client, port_name, self.read_proc, None, ctypes.byref(self.port)), "create input port")
        self.connect_new_sources()

    def _cfstring(self, text):
        return self.cf.CFStringCreateWithCString(None, text.encode("utf-8"), 0x08000100)

    @staticmethod
    def _check(status, what):
        if status != 0:
            raise RuntimeError(f"CoreMIDI could not {what} (error {status})")

    def source_name(self, endpoint):
        value = ctypes.c_void_p()
        if self.midi.MIDIObjectGetStringProperty(endpoint, self.display_name, ctypes.byref(value)) != 0 or not value.value:
            return "MIDI source"
        buffer = ctypes.create_string_buffer(256)
        self.cf.CFStringGetCString(value, buffer, 256, 0x08000100)
        self.cf.CFRelease(value)
        return buffer.value.decode("utf-8", "replace")

    def connect_new_sources(self):
        """Connects sources that appeared since last time; returns the names of all sources."""
        names = []
        for index in range(self.midi.MIDIGetNumberOfSources()):
            endpoint = self.midi.MIDIGetSource(index)
            names.append(self.source_name(endpoint))
            if endpoint and endpoint not in self.connected:
                if self.midi.MIDIPortConnectSource(self.port, endpoint, ctypes.c_void_p(endpoint)) == 0:
                    self.connected.add(endpoint)
                    print(f"  connected: {names[-1]}", flush=True)
        return names

    def _read(self, packet_list, _read_ref, source_ref):
        # MIDIPacketList: UInt32 numPackets, then packets of UInt64 time, UInt16 length, bytes data.
        count = ctypes.c_uint32.from_address(packet_list).value
        address = packet_list + 4
        for _ in range(count):
            length = ctypes.c_uint16.from_address(address + 8).value
            data = ctypes.string_at(address + 10, length)
            self._parse(source_ref or 0, data)
            address = address + 10 + length
            if self.arm:
                address = (address + 3) & ~3

    def _parse(self, source, data):
        """Splits a packet into channel messages (with running status) and passes each one on."""
        status = self.running_status.get(source)
        index = 0
        while index < len(data):
            byte = data[index]
            if byte >= 0xF8:
                index += 1
                continue
            if byte & 0x80:
                status = byte if byte < 0xF0 else None
                index += 1
                if status is None:
                    while index < len(data) and not data[index] & 0x80:
                        index += 1
                    continue
            if status is None:
                index += 1
                continue
            size = 1 if (status & 0xF0) in (0xC0, 0xD0) else 2
            message = data[index:index + size]
            index += size
            if len(message) == size:
                self.on_message([status, *message])
        self.running_status[source] = status


# --- HTTP + WebSocket server -----------------------------------------------------------------------

class Handler(http.server.SimpleHTTPRequestHandler):
    # Browsers only accept a WebSocket handshake over HTTP/1.1.
    protocol_version = "HTTP/1.1"

    def log_message(self, *_args):
        pass

    def end_headers(self):
        # Always the newest files while you work on the site.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path.split("?")[0] == "/midi" and self.headers.get("Upgrade", "").lower() == "websocket":
            self.handle_websocket()
            return
        super().do_GET()

    def handle_websocket(self):
        key = self.headers.get("Sec-WebSocket-Key", "")
        accept = base64.b64encode(hashlib.sha1((key + WEBSOCKET_GUID).encode()).digest()).decode()
        self.send_response(101, "Switching Protocols")
        self.send_header("Upgrade", "websocket")
        self.send_header("Connection", "Upgrade")
        self.send_header("Sec-WebSocket-Accept", accept)
        super().end_headers()
        self.wfile.flush()
        client = WebSocketClient(self.connection)
        CLIENTS.add(client)
        client.send_text(json.dumps({"type": "hello", "sources": STATE["sources"]}))
        try:
            while True:
                opcode, payload = client.read_frame()
                if opcode == 0x8:
                    break
                if opcode == 0x9:
                    client.send_frame(0xA, payload)
        except (ConnectionError, OSError):
            pass
        finally:
            client.open = False
            CLIENTS.remove(client)
        self.close_connection = True


STATE = {"sources": []}


def run_midi(ready):
    """Owns CoreMIDI on its own thread. macOS reports new or removed controllers through this
    thread's run loop, so it keeps running it and connects every new source it sees."""
    try:
        midi_input = CoreMidiInput(lambda message: CLIENTS.send_all(json.dumps({"type": "midi", "data": message})))
    except Exception as error:  # noqa: BLE001 - shown to the user, then the bridge stops
        ready["error"] = error
        ready["event"].set()
        return
    STATE["sources"] = midi_input.connect_new_sources()
    ready["event"].set()
    while True:
        midi_input.cf.CFRunLoopRunInMode(midi_input.run_loop_mode, 1.0, False)
        names = midi_input.connect_new_sources()
        if names != STATE["sources"]:
            STATE["sources"] = names
            CLIENTS.send_all(json.dumps({"type": "sources", "sources": names}))


def main():
    parser = argparse.ArgumentParser(description="MIDI bridge for the Accidental Graphics apps.")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()

    print("Accidental Graphics MIDI bridge", flush=True)
    ready = {"event": threading.Event(), "error": None}
    threading.Thread(target=run_midi, args=(ready,), daemon=True).start()
    ready["event"].wait()
    if ready["error"]:
        sys.exit(f"MIDI is not available: {ready['error']}")
    if not STATE["sources"]:
        print("  no MIDI controller yet; plug one in, it is picked up automatically", flush=True)

    handler = functools.partial(Handler, directory=SITE_ROOT)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    server.daemon_threads = True
    print(f"\nOpen in Safari:  http://localhost:{args.port}/apps/Isolation/", flush=True)
    print("Leave this window open while you play. Stop with Ctrl+C.\n", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nBridge stopped.")


if __name__ == "__main__":
    if sys.platform != "darwin":
        sys.exit("This bridge uses macOS CoreMIDI and only runs on a Mac.")
    main()
