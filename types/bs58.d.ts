declare module 'bs58' {
  function encode(data: Uint8Array | Buffer): string;
  function decode(data: string): Uint8Array;
  export { encode, decode };
  export default { encode, decode };
}
