// Small, dependency-free file writers for Isolation's video export:
// an MP4 muxer for H.264 chunks from WebCodecs, and an uncompressed ZIP writer for PNG frame sequences.
(function () {
  "use strict";

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) {
      crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // --- MP4 -------------------------------------------------------------------
  // One video track, all samples in one chunk, moov at the end. Expects chunks in presentation order
  // (the encoder runs without B-frames) and the avcC record from the encoder's decoderConfig.description.

  function u8(value) {
    return [value & 0xff];
  }

  function u16(value) {
    return [(value >>> 8) & 0xff, value & 0xff];
  }

  function u32(value) {
    return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
  }

  function ascii(text) {
    return Array.from(text, (char) => char.charCodeAt(0));
  }

  function concatBytes(parts) {
    const arrays = parts.map((part) => (part instanceof Uint8Array ? part : Uint8Array.from(part)));
    const total = arrays.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    arrays.forEach((part) => {
      out.set(part, offset);
      offset += part.length;
    });
    return out;
  }

  function box(type, ...parts) {
    const body = concatBytes(parts);
    return concatBytes([u32(body.length + 8), ascii(type), body]);
  }

  function fullBox(type, version, flags, ...parts) {
    return box(type, [version, (flags >>> 16) & 0xff, (flags >>> 8) & 0xff, flags & 0xff], ...parts);
  }

  const MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].flatMap(u32);

  function createMp4Muxer({ width, height, fps }) {
    const samples = [];
    let description = null;
    const timescale = fps * 1000;
    const sampleDelta = 1000;

    return {
      addChunk(chunk, metadata) {
        if (!description && metadata && metadata.decoderConfig && metadata.decoderConfig.description) {
          const source = metadata.decoderConfig.description;
          description = new Uint8Array(source.buffer ? source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) : source);
        }
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        samples.push({ data, key: chunk.type === "key", timestamp: chunk.timestamp });
      },
      finish() {
        if (!description) {
          throw new Error("The encoder gave no avcC description");
        }
        samples.sort((a, b) => a.timestamp - b.timestamp);
        const count = samples.length;
        const mediaDuration = count * sampleDelta;
        const movieDuration = Math.round((count * 1000) / fps);

        const ftyp = box("ftyp", ascii("isom"), u32(0x200), ascii("isomiso2avc1mp41"));
        const mdatSize = 8 + samples.reduce((sum, sample) => sum + sample.data.length, 0);
        const chunkOffset = ftyp.length + 8;

        const avcC = box("avcC", description);
        const compressor = new Array(32).fill(0);
        const avc1 = box(
          "avc1",
          new Array(6).fill(0),
          u16(1),
          u16(0),
          u16(0),
          u32(0),
          u32(0),
          u32(0),
          u16(width),
          u16(height),
          u32(0x00480000),
          u32(0x00480000),
          u32(0),
          u16(1),
          compressor,
          u16(0x0018),
          u16(0xffff),
          avcC
        );
        const stsd = fullBox("stsd", 0, 0, u32(1), avc1);
        const stts = fullBox("stts", 0, 0, u32(1), u32(count), u32(sampleDelta));
        const keyIndexes = [];
        samples.forEach((sample, index) => {
          if (sample.key) {
            keyIndexes.push(index + 1);
          }
        });
        const stss = fullBox("stss", 0, 0, u32(keyIndexes.length), keyIndexes.flatMap(u32));
        const stsc = fullBox("stsc", 0, 0, u32(1), u32(1), u32(count), u32(1));
        const stsz = fullBox("stsz", 0, 0, u32(0), u32(count), samples.flatMap((sample) => u32(sample.data.length)));
        const stco = fullBox("stco", 0, 0, u32(1), u32(chunkOffset));
        const stbl = box("stbl", stsd, stts, stss, stsc, stsz, stco);

        const vmhd = fullBox("vmhd", 0, 1, u16(0), u16(0), u16(0), u16(0));
        const dref = fullBox("dref", 0, 0, u32(1), fullBox("url ", 0, 1));
        const minf = box("minf", vmhd, box("dinf", dref), stbl);
        const mdhd = fullBox("mdhd", 0, 0, u32(0), u32(0), u32(timescale), u32(mediaDuration), u16(0x55c4), u16(0));
        const hdlr = fullBox("hdlr", 0, 0, u32(0), ascii("vide"), u32(0), u32(0), u32(0), ascii("VideoHandler"), u8(0));
        const mdia = box("mdia", mdhd, hdlr, minf);
        const tkhd = fullBox(
          "tkhd",
          0,
          3,
          u32(0),
          u32(0),
          u32(1),
          u32(0),
          u32(movieDuration),
          u32(0),
          u32(0),
          u16(0),
          u16(0),
          u16(0),
          u16(0),
          MATRIX,
          u32(width << 16),
          u32(height << 16)
        );
        const trak = box("trak", tkhd, mdia);
        const mvhd = fullBox(
          "mvhd",
          0,
          0,
          u32(0),
          u32(0),
          u32(1000),
          u32(movieDuration),
          u32(0x00010000),
          u16(0x0100),
          u16(0),
          u32(0),
          u32(0),
          MATRIX,
          new Array(24).fill(0),
          u32(2)
        );
        const moov = box("moov", mvhd, trak);

        return new Blob([ftyp, Uint8Array.from(u32(mdatSize)), Uint8Array.from(ascii("mdat")), ...samples.map((sample) => sample.data), moov], {
          type: "video/mp4",
        });
      },
    };
  }

  // H.264 level for a frame size and rate (smallest that fits), as an avc1 codec string (High profile).
  function avcCodecFor(width, height, fps) {
    const macroblocks = Math.ceil(width / 16) * Math.ceil(height / 16);
    const levels = [
      [0x28, 8192, 245760],
      [0x2a, 8704, 522240],
      [0x32, 22080, 589824],
      [0x33, 36864, 983040],
      [0x34, 36864, 2073600],
      [0x3c, 139264, 4177920],
    ];
    const level = levels.find(([, frame, rate]) => macroblocks <= frame && macroblocks * fps <= rate);
    return level ? `avc1.6400${level[0].toString(16).padStart(2, "0")}` : null;
  }

  // --- ZIP -------------------------------------------------------------------
  // Stored (uncompressed) entries: PNGs are already compressed.

  function le16(value) {
    return [value & 0xff, (value >>> 8) & 0xff];
  }

  function le32(value) {
    return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
  }

  function createZipWriter() {
    const parts = [];
    const entries = [];
    let offset = 0;
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

    return {
      add(name, bytes) {
        const nameBytes = new TextEncoder().encode(name);
        const crc = crc32(bytes);
        const header = Uint8Array.from([
          ...le32(0x04034b50),
          ...le16(20),
          ...le16(0),
          ...le16(0),
          ...le16(dosTime),
          ...le16(dosDate),
          ...le32(crc),
          ...le32(bytes.length),
          ...le32(bytes.length),
          ...le16(nameBytes.length),
          ...le16(0),
        ]);
        parts.push(header, nameBytes, bytes);
        entries.push({ nameBytes, crc, size: bytes.length, offset });
        offset += header.length + nameBytes.length + bytes.length;
      },
      finish() {
        const central = [];
        let centralSize = 0;
        entries.forEach((entry) => {
          const record = Uint8Array.from([
            ...le32(0x02014b50),
            ...le16(20),
            ...le16(20),
            ...le16(0),
            ...le16(0),
            ...le16(dosTime),
            ...le16(dosDate),
            ...le32(entry.crc),
            ...le32(entry.size),
            ...le32(entry.size),
            ...le16(entry.nameBytes.length),
            ...le16(0),
            ...le16(0),
            ...le16(0),
            ...le16(0),
            ...le32(0),
            ...le32(entry.offset),
          ]);
          central.push(record, entry.nameBytes);
          centralSize += record.length + entry.nameBytes.length;
        });
        const end = Uint8Array.from([
          ...le32(0x06054b50),
          ...le16(0),
          ...le16(0),
          ...le16(entries.length),
          ...le16(entries.length),
          ...le32(centralSize),
          ...le32(offset),
          ...le16(0),
        ]);
        return new Blob([...parts, ...central, end], { type: "application/zip" });
      },
    };
  }

  window.IsolationEncoders = { createMp4Muxer, avcCodecFor, createZipWriter, crc32 };
})();
