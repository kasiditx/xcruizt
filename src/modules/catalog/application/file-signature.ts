export function hasExpectedFileSignature(
  filename: string,
  bytes: Uint8Array,
): boolean {
  const extension = filename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  if (extension === ".zip") {
    return (
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
        (bytes[2] === 0x05 && bytes[3] === 0x06) ||
        (bytes[2] === 0x07 && bytes[3] === 0x08))
    );
  }
  if (extension === ".pdf") {
    return [0x25, 0x50, 0x44, 0x46].every(
      (byte, index) => bytes[index] === byte,
    );
  }
  if (extension === ".exe") {
    return bytes[0] === 0x4d && bytes[1] === 0x5a;
  }
  if (extension === ".txt") {
    if (bytes.length === 0 || bytes.includes(0)) return false;
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return true;
    } catch {
      return false;
    }
  }

  if (extension === ".ini") {
    if (bytes.length === 0 || bytes.includes(0)) return false;
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return true;
    } catch {
      return false;
    }
  }

  if (extension === ".rar") {
    const rar4 = [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00];
    const rar5 = [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00];
    return [rar4, rar5].some((signature) =>
      signature.every((byte, index) => bytes[index] === byte),
    );
  }

  return false;
}
