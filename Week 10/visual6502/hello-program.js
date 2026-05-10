// Apple 1 "Hello World" demo program (self-contained).
//
// Loaded at $0000. The reset vector at $FFFC/$FFFD reads as 0 because
// uninitialised memory reads as zero, so the chip cold-starts at $0000.
// The program walks a null-terminated string at $0020, ORs each byte
// with $80 (the Apple 1 high-bit ASCII convention), writes it to the
// memory-mapped display register at $D012, and halts in an infinite
// loop once the terminator is reached.
//
// Two zero-page locations are also written each iteration so the
// zero-page memtable on the page shows live activity:
//   $E0 holds a byte counter, incremented after every character output.
//   $E1 holds the most recent raw character (before the high-bit set).
//
//   $0000  A2 00            LDX #$00
//   $0002  B5 20      LOOP: LDA $20,X         ; load string[X]
//   $0004  F0 0C            BEQ DONE          ; null terminator → exit
//   $0006  85 E1            STA $E1           ; save raw char to zero page
//   $0008  09 80            ORA #$80          ; force hi-bit
//   $000A  8D 12 D0         STA $D012         ; output character
//   $000D  E6 E0            INC $E0           ; bump byte counter
//   $000F  E8               INX
//   $0010  D0 F0            BNE LOOP
//   $0012  4C 12 00   DONE: JMP DONE          ; halt
//   $0020  "HELLO, WORLD!\r" 0

testprogramAddress = 0x0000;

testprogram = [
    /* $0000 */ 0xA2, 0x00,
    /* $0002 */ 0xB5, 0x20,
    /* $0004 */ 0xF0, 0x0C,
    /* $0006 */ 0x85, 0xE1,
    /* $0008 */ 0x09, 0x80,
    /* $000A */ 0x8D, 0x12, 0xD0,
    /* $000D */ 0xE6, 0xE0,
    /* $000F */ 0xE8,
    /* $0010 */ 0xD0, 0xF0,
    /* $0012 */ 0x4C, 0x12, 0x00,
    // padding $0015 to $001F — never executed
    /* $0015 */ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    /* $001C */ 0x00, 0x00, 0x00, 0x00,
    // "HELLO, WORLD!\r" + null terminator
    /* $0020 */ 0x48, 0x45, 0x4C, 0x4C, 0x4F, 0x2C, 0x20, 0x57,
    /* $0028 */ 0x4F, 0x52, 0x4C, 0x44, 0x21, 0x0D, 0x00
];

// Memory-mapped I/O hooks for the Apple 1 PIA registers. Strings here
// are eval'd in the bus-cycle handlers in macros.js. Only the display
// write at $D012 is exercised by this program; the keyboard hooks are
// kept active so the terminal still accepts user input if needed.
writeTriggers[0xD012] = "if (typeof appendApple1Char === 'function') { appendApple1Char(d & 0x7F); }";
readTriggers[0xD010]  = "var c = (typeof appleKeyQueue !== 'undefined' && appleKeyQueue.length) ? appleKeyQueue.shift() : 0; (c | 0x80)";
readTriggers[0xD011]  = "((typeof appleKeyQueue !== 'undefined' && appleKeyQueue.length) ? 0xA7 : 0x00)";
// Display always reports ready (bit 7 clear) so any wait-for-display
// loop falls through immediately.
readTriggers[0xD012]  = "0";
