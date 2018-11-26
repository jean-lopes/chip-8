Number.prototype.toBitArray = function() {
	var bin = this.toString(2),
		ret = [];

	for (var i = 0; i < bin.length; i++) {
		ret.push(+bin[i]);
	}

	while (ret.length % 8 !== 0) {
		ret.unshift(0);
	}

	return ret;
};

var chip8 = {
	v: null,
	i: null,
	pc: null,
	sp: null,
	dt: null,
	st: null,
	stack: null,
	ram: null,
	programEnd: null,
	keyboard: null,
	display: null,
	canvas: null,
	context: null,
	isRunning: null,
	isWaitingKey: null,
	vTarget: null,
	step: null,
	drawFlag: null,
	zoom: 10,
	background: 'black',
	foreground: 'green',
	displayWidth: 64,
	displayHeight: 32,
	sprites: [
		0xF0, 0x90, 0x90, 0x90, 0xF0,
		0x20, 0x60, 0x20, 0x20, 0x70,
		0xF0, 0x10, 0xF0, 0x80, 0xF0,
		0xF0, 0x10, 0xF0, 0x10, 0xF0,
		0x90, 0x90, 0xF0, 0x10, 0x10,
		0xF0, 0x80, 0xF0, 0x10, 0xF0,
		0xF0, 0x80, 0xF0, 0x90, 0xF0,
		0xF0, 0x10, 0x20, 0x40, 0x40,
		0xF0, 0x90, 0xF0, 0x90, 0xF0,
		0xF0, 0x90, 0xF0, 0x10, 0xF0,
		0xF0, 0x90, 0xF0, 0x90, 0x90,
		0xE0, 0x90, 0xE0, 0x90, 0xE0,
		0xF0, 0x80, 0x80, 0x80, 0xF0,
		0xE0, 0x90, 0x90, 0x90, 0xE0,
		0xF0, 0x80, 0xF0, 0x80, 0xF0,
		0xF0, 0x80, 0xF0, 0x80, 0x80
	],

	create: function(canvasId) {
		var obj = Object.create(this);

		obj.canvas = document.getElementById(canvasId);

		obj.canvas.width = obj.displayWidth * obj.zoom;

		obj.canvas.height = obj.displayHeight * obj.zoom;

		obj.context = canvas.getContext('2d');

		obj.reset();

		return obj;
	},

	reset: function() {
		this.v = new Uint8Array(16);

		this.i = 0;

		this.pc = 0x200;

		this.sp = 0;

		this.dt = 0;

		this.st = 0;

		this.stack = new Uint16Array(16);

		this.ram = new Uint8Array(4096);

		this.programEnd = 0;

		this.isRunning = false;

		this.display = [];

		this.isWaitingKey = false;

		this.vTarget = null;

		this.keyboard = new Array(16);

		this.step = 0;

		this.drawFlag = true;

		document.addEventListener('chip8.keydown', function(e) {
			e.detail.chip.keyboard[e.detail.key] = true;
			e.detail.chip.v[e.detail.chip.vTarget] = e.detail.key;
			e.detail.chip.isWaitingKey = false;
			e.detail.chip.vTarget = null;
		});

		document.addEventListener('chip8.keyup', function(e) {
			e.detail.chip.keyboard[e.detail.key] = false;
		})

		for (var i = 0; i < this.displayHeight; i++) {
			this.display.unshift([]);
			this.display[0] = [];
			for (var j = 0; j < this.displayWidth; j++) {
				this.display[0][j] = 0;
			}
		}

		for (var i = 0; i < this.sprites.length; i++) {
			this.ram[i] = this.sprites[i];
		}

		for (var i = 0; i < this.keyboard.length; i++) {
			this.keyboard[i] = false;
		}		
	},

	log: function(msg) {
		console.log(msg.toUpperCase());
	},

	load: function(rom) {
		this.reset();

		var addr = 0x200;

		for (var i = 0; i < rom.length; i++) {
			this.ram[addr++] = rom[i];
		}

		this.pc = 0x200;
		this.programEnd = this.pc + rom.length;
	},

	run: function() {
		var _this = this;

		this.isRunning = true;

		update();

		function update(timeStamp) {
			if (_this.pc >= 0x200 && _this.pc < _this.programEnd && _this.isRunning) {
				for (var i = 0; i < 5; i++) {
					if (!_this.isWaitingKey) {
						_this.cycle();
					}
				}

				_this.draw();
				_this.handleTimers();

				requestAnimationFrame(update);
			}
		}
	},

	stop: function() {
		this.isRunning = false;
	},

	draw: function() {
		if (!this.drawFlag) {
			return;
		}
		this.drawFlag = false;
		this.context.beginPath();
		this.context.rect(0, 0, this.canvas.width, this.canvas.height);
		this.context.fillStyle = this.background;
		this.context.fill();

		for (var i = 0; i < this.displayHeight; i++) {
			for (var j = 0; j < this.displayWidth; j++) {
				var pixel = this.display[i][j];

				if (pixel) {
					this.context.beginPath();
					this.context.rect(j * this.zoom, i * this.zoom, this.zoom, this.zoom);
					this.context.fillStyle = this.foreground;
					this.context.fill();
				}
			}
		}


	},

	handleTimers: function() {
		if (!(this.step++ % 2)) {
			if (this.dt > 0) {
				this.dt--;
			}

			if (this.st > 0) {
				this.st--;
				// TODO play sound
			}
		}
	},

	cycle: function() {
		var opcode = (this.ram[this.pc] << 8) + this.ram[this.pc + 1],
			x = (opcode & 0x0F00) >> 8,
			y = (opcode & 0x00F0) >> 4,
			addr = opcode & 0x0FFF,
			byte = opcode & 0x00FF,
			nibble = opcode & 0x000F,
			unknowOpcode = '<unknow opcode: 0x' + opcode.toString(16).toUpperCase() + '>';

		this.pc += 2;

		switch ((opcode & 0xF000) >> 12) {
			case 0x0:
				switch (byte) {
					case 0xE0:
						this.cls();
						break;
					case 0xEE:
						this.ret();
						break;
					default:
						this.sys(addr);
						break;
				}
				break;
			case 0x1:
				this.jp(addr);
				break;
			case 0x2:
				this.call(addr);
				break;
			case 0x3:
				this.se(x, byte);
				break;
			case 0x4:
				this.sne(x, byte);
				break;
			case 0x5:
				this.se2(x, y);
				break;
			case 0x6:
				this.ld(x, byte);
				break;
			case 0x7:
				this.add(x, byte);
				break;
			case 0x8:
				switch (nibble) {
					case 0x0:
						this.ld2(x, y);
						break;
					case 0x1:
						this.or(x, y);
						break;
					case 0x2:
						this.and(x, y);
						break;
					case 0x3:
						this.xor(x, y);
						break;
					case 0x4:
						this.add2(x, y);
						break;
					case 0x5:
						this.sub(x, y);
						break;
					case 0x6:
						this.shr(x, y);
						break;
					case 0x7:
						this.subn(x, y);
						break;
					case 0xE:
						this.shl(x, y);
						break;
					default:
						throw unknowOpcode;
				}
				break;
			case 0x9:
				this.sne2(x, y);
				break;
			case 0xA:
				this.ld3(addr);
				break;
			case 0xB:
				this.jp2(addr);
				break;
			case 0xC:
				this.rnd(x, byte);
				break;
			case 0xD:
				this.drw(x, y, nibble);
				break;
			case 0xE:
				switch (byte) {
					case 0x9E:
						this.skp(x);
						break;
					case 0xA1:
						this.sknp(x);
						break;
					default:
						throw unknowOpcode;
				}
				break;
			case 0xF:
				switch (byte) {
					case 0x07:
						this.ld4(x);
					case 0x0A:
						this.ld5(x);
						break;
					case 0x15:
						this.ld6(x);
						break;
					case 0x18:
						this.ld7(x);
						break;
					case 0x1E:
						this.add3(x);
						break;
					case 0x29:
						this.ld8(x);
						break;
					case 0x33:
						this.ld9(x);
						break;
					case 0x55:
						this.ld10(x);
						break;
					case 0x65:
						this.ld11(x);
						break;
					default:
						throw unknowOpcode;
				}
				break;
			default:
				throw unknowOpcode;
		}
	},

	/**
	 * 0nnn - SYS addr
	 * Jump to a machine code routine at nnn.
	 * This instruction is only used on the old computers on which Chip-8 was originally implemented. It is ignored by modern interpreters.
	 */
	sys: function(addr) {
		this.log('sys ' + addr);
	},

	/**
	 * 00E0 - CLS
	 * Clear the display.
	 */
	cls: function() {
		this.log('cls');
		for (var i = 0; i < this.displayHeight; i++) {
			for (var j = 0; j < this.displayWidth; j++) {
				this.display[i][j] = 0;
			}
		}
	},

	/**
	 * 00EE - RET
	 * Return from a subroutine.
	 * The interpreter sets the program counter to the address at the top of the stack, then subtracts 1 from the stack pointer.
	 */
	ret: function() {
		this.log('ret');
		this.pc = this.stack[--this.sp];
	},

	/**
	 * 2nnn - CALL addr
	 * Call subroutine at nnn.
	 * The interpreter increments the stack pointer, then puts the current PC on the top of the stack. The PC is then set to nnn.
	 */
	call: function(addr) {
		this.log('call ' + addr);
		this.stack[this.sp] = this.pc;
		this.sp++;
		this.pc = addr;
	},

	/**
	 * Dxyn - DRW Vx, Vy, nibble
	 * Display n-byte sprite starting at memory location I at (Vx, Vy), set VF = collision.
	 * The interpreter reads n bytes from memory, starting at the address stored in I. These bytes are then displayed as sprites on screen at coordinates (Vx, Vy). Sprites are XORed onto the existing screen. If this causes any pixels to be erased, VF is set to 1, otherwise it is set to 0. If the sprite is positioned so part of it is outside the coordinates of the display, it wraps around to the opposite side of the screen. See instruction 8xy3 for more information on XOR, and section 2.4, Display, for more information on the Chip-8 screen and sprites.
	 */
	drw: function(x, y, nibble) {
		this.log('drw v' + x + ', v' + y + ', ' + nibble);

		this.drawFlag = true;

		this.v[0xF] = 0;

		for (var i = 0; i < nibble; i++) {
			var ln = (i + this.v[y]) % this.displayHeight,
				bits = this.ram[this.i + i].toBitArray();

			for (var j = 0; j < bits.length; j++) {
				var cl = (j + this.v[x]) % this.displayWidth,
					pixel = this.display[ln][cl];

				this.display[ln][cl] ^= bits[j];

				this.v[0xF] |= +(pixel !== this.display[ln][cl]);
			}
		}
	},

	/**
	 * 8xy1 - OR Vx, Vy
	 * Set Vx = Vx OR Vy.
	 * Performs a bitwise OR on the values of Vx and Vy, then stores the result in Vx. A bitwise OR compares the corrseponding bits from two values, and if either bit is 1, then the same bit in the result is also 1. Otherwise, it is 0. 
	 */
	or: function(x, y) {
		this.log('or v' + x + ', v' + y);
		this.v[x] |= this.v[y];
	},

	/**
	 * Cxkk - RND Vx, byte
	 * Set Vx = random byte AND kk.
	 * The interpreter generates a random number from 0 to 255, which is then ANDed with the value kk. The results are stored in Vx. See instruction 8xy2 for more information on AND.
	 */
	rnd: function(x, byte) {
		this.log('rnd v' + x + ', ' + byte);
		this.v[x] = Math.floor(Math.random() * 0xFF) & byte;
	},

	/**
	 * 8xyE - SHL Vx {, Vy}
	 * Set Vx = Vx SHL 1.
	 * If the most-significant bit of Vx is 1, then VF is set to 1, otherwise to 0. Then Vx is multiplied by 2.
	 */
	shl: function(x, y) {
		this.log('shl v' + x + ', v' + y);
		this.v[0xF] = this.v[x] >> 7;
		this.v[x] <<= 1;

		if (this.v[x] > 255) {
			this.v[x] -= 256;
		}
	},

	/**
	 * 8xy6 - SHR Vx {, Vy}
	 * Set Vx = Vx SHR 1.
	 * If the least-significant bit of Vx is 1, then VF is set to 1, otherwise 0. Then Vx is divided by 2.
	 */
	shr: function(x, y) {
		this.log('shr v' + x + ', v' + y);
		this.v[0xF] = this.v[x] & 0x1;
		this.v[x] >>= 1;
	},

	/**
	 * ExA1 - SKNP Vx
	 * Skip next instruction if key with the value of Vx is not pressed.
	 * Checks the keyboard, and if the key corresponding to the value of Vx is currently in the up position, PC is increased by 2.
	 */
	sknp: function(x) {
		this.log('sknp v' + x);
		if (this.keyboard[this.v[x]] === false) {
			this.pc += 2;
		}
	},

	/**
	 * Ex9E - SKP Vx
	 * Skip next instruction if key with the value of Vx is pressed.
	 * Checks the keyboard, and if the key corresponding to the value of Vx is currently in the down position, PC is increased by 2.
	 */
	skp: function(x) {
		this.log('skp v' + x);
		if (this.keyboard[this.v[x]] === true) {
			this.pc += 2;
		}
	},

	/**
	 * 8xy5 - SUB Vx, Vy
	 * Set Vx = Vx - Vy, set VF = NOT borrow.
	 * If Vx > Vy, then VF is set to 1, otherwise 0. Then Vy is subtracted from Vx, and the results stored in Vx.
	 */
	sub: function(x, y) {
		this.log('sub v' + x + ', v' + y);
		this.v[0xF] = +(this.v[x] > this.v[y]);
		this.v[x] -= this.v[y];
		if (this.v[x] < 0) {
			this.v[x] += 256;
		}
	},

	/**
	 * 8xy7 - SUBN Vx, Vy
	 * Set Vx = Vy - Vx, set VF = NOT borrow.
	 * If Vy > Vx, then VF is set to 1, otherwise 0. Then Vx is subtracted from Vy, and the results stored in Vx.
	 */
	subn: function(x, y) {
		this.log('subn v' + x + ', v' + y);
		this.v[0xF] = +(this.v[y] > this.v[x]);
		this.v[x] = this.v[y] - this.v[x];
		if (this.v[x] < 0) {
			this.v[x] += 256;
		}
	},

	/**
	 * 8xy3 - XOR Vx, Vy
	 * Set Vx = Vx XOR Vy.
	 * Performs a bitwise exclusive OR on the values of Vx and Vy, then stores the result in Vx. An exclusive OR compares the corrseponding bits from two values, and if the bits are not both the same, then the corresponding bit in the result is set to 1. Otherwise, it is 0. 
	 */
	xor: function(x, y) {
		this.log('xor v' + x + ', v' + y);
		this.v[x] ^= this.v[y];
	},

	/** 
	 * 8xy2 - AND Vx, Vy
	 * Set Vx = Vx AND Vy.
	 * Performs a bitwise AND on the values of Vx and Vy, then stores the result in Vx. A bitwise AND compares the corrseponding bits from two values, and if both bits are 1, then the same bit in the result is also 1. Otherwise, it is 0. 
	 */
	and: function(x, y) {
		this.log('and v' + x + ', v' + y);
		this.v[x] &= this.v[y];
	},

	/**
	 * 1nnn - JP addr
	 * Jump to location nnn.
	 * The interpreter sets the program counter to nnn.
	 */
	jp: function(addr) {
		this.log('jp ' + addr);
		this.pc = addr;
	},

	/**
	 * Bnnn - JP V0, addr
	 * Jump to location nnn + V0.
	 * The program counter is set to nnn plus the value of V0.
	 */
	jp2: function(addr) {
		this.log('jp v0, ' + addr);
		this.pc = this.v[0] + addr;
	},

	/**
	 * 3xkk - SE Vx, byte
	 * Skip next instruction if Vx = kk.
	 * The interpreter compares register Vx to kk, and if they are equal, increments the program counter by 2.
	 */
	se: function(x, byte) {
		this.log('se v' + x + ', ' + byte);
		if (this.v[x] === byte) {
			this.pc += 2;
		}
	},

	/**
	 * 5xy0 - SE Vx, Vy
	 * Skip next instruction if Vx = Vy.
	 * The interpreter compares register Vx to register Vy, and if they are equal, increments the program counter by 2.
	 */
	se2: function(x, y) {
		this.log('se v' + x + ', v' + y);
		if (this.v[x] === this.v[y]) {
			this.pc += 2;
		}
	},

	/**
	 * 4xkk - SNE Vx, byte
	 * Skip next instruction if Vx != kk.
	 * The interpreter compares register Vx to kk, and if they are not equal, increments the program counter by 2.
	 */
	sne: function(x, byte) {
		this.log('sne v' + x + ', ' + byte);
		if (this.v[x] !== byte) {
			this.pc += 2;
		}
	},

	/**
	 * 9xy0 - SNE Vx, Vy
	 * Skip next instruction if Vx != Vy.
	 * The values of Vx and Vy are compared, and if they are not equal, the program counter is increased by 2.
	 */
	sne2: function(x, y) {
		this.log('sne v' + x + ', v' + y);
		if (this.v[x] !== this.v[y]) {
			this.pc += 2;
		}
	},

	/**
	 * 7xkk - ADD Vx, byte
	 * Set Vx = Vx + kk.
	 * Adds the value kk to the value of register Vx, then stores the result in Vx. 
	 */
	add: function(x, byte) {
		this.log('add v' + x + ', ' + byte);

		var value = this.v[x] + byte;

		if (value > 255) {
			value -= 256;
		}

		this.v[x] = value;
	},

	/**
	 * 8xy4 - ADD Vx, Vy
	 * Set Vx = Vx + Vy, set VF = carry.
	 * The values of Vx and Vy are added together. If the result is greater than 8 bits (i.e., > 255,) VF is set to 1, otherwise 0. Only the lowest 8 bits of the result are kept, and stored in Vx.
	 */
	add2: function(x, y) {
		this.log('add V' + x + ', V' + y);
		var value = this.v[x] + this.v[y];

		this.v[0xF] = +(value > 255);

		if (this.v[0xF]) {
			value -= 256;
		}

		this.v[x] = value;
	},

	/**
	 * Fx1E - ADD I, Vx
	 * Set I = I + Vx.
	 * The values of I and Vx are added, and the results are stored in I.
	 */
	add3: function(x) {
		this.log('add I, V' + x);
		this.i += this.v[x];
	},

	/**
	 * 6xkk - LD Vx, byte
	 * Set Vx = kk.
	 * The interpreter puts the value kk into register Vx.
	 */
	ld: function(x, byte) {
		this.log('ld V' + x + ', ' + byte);
		this.v[x] = byte;
	},

	/**
	 * 8xy0 - LD Vx, Vy
	 * Set Vx = Vy.
	 * Stores the value of register Vy in register Vx.
	 */
	ld2: function(x, y) {
		this.log('ld V' + x + ', V' + y);
		this.v[x] = this.v[y];
	},

	/**
	 * Annn - LD I, addr
	 * Set I = nnn.
	 * The value of register I is set to nnn.
	 */
	ld3: function(addr) {
		this.log('ld I, ' + addr);
		this.i = addr;
	},

	/**
	 * Fx07 - LD Vx, DT
	 * Set Vx = delay timer value.
	 * The value of DT is placed into Vx.
	 */
	ld4: function(x) {
		this.log('ld V' + x + ', DT');
		this.v[x] = this.dt;
	},

	/**
	 * Fx0A - LD Vx, K
	 * Wait for a key press, store the value of the key in Vx.
	 * All execution stops until a key is pressed, then the value of that key is stored in Vx.
	 */
	ld5: function(x) {
		this.log('ld V' + x + ', K');
		this.isWaitingKey = true;
		this.vTarget = x;
	},

	/**
	 * Fx15 - LD DT, Vx
	 * Set delay timer = Vx.
	 * DT is set equal to the value of Vx.
	 */
	ld6: function(x) {
		this.log('ld DT, V' + x);
		this.dt = this.v[x];
	},

	/**
	 * Fx18 - LD ST, Vx
	 * Set sound timer = Vx.
	 * ST is set equal to the value of Vx.	
	 */
	ld7: function(x) {
		this.log('ld ST, V' + x);
		this.st = this.v[x];
	},

	/**
	 * Fx29 - LD F, Vx
	 * Set I = location of sprite for digit Vx.
	 * The value of I is set to the location for the hexadecimal sprite corresponding to the value of Vx. See section 2.4, Display, for more information on the Chip-8 hexadecimal font.
	 */
	ld8: function(x) {
		this.log('ld F, V' + x);
		this.i = this.v[x] * 5;
	},

	/**
	 * Fx33 - LD B, Vx
	 * Store BCD representation of Vx in memory locations I, I+1, and I+2.
	 * The interpreter takes the decimal value of Vx, and places the hundreds digit in memory at location in I, the tens digit at location I+1, and the ones digit at location I+2.
	 */
	ld9: function(x) {
		this.log('ld B, V' + x);
		var s = '000' + this.v[x].toString();

		s = s.substring(s.length - 3, s.length);

		this.ram[this.i] = parseInt(s[0]);
		this.ram[this.i + 1] = parseInt(s[1]);
		this.ram[this.i + 2] = parseInt(s[2]);
	},

	/**
	 * Fx55 - LD [I], Vx
	 * Store registers V0 through Vx in memory starting at location I.
	 * The interpreter copies the values of registers V0 through Vx into memory, starting at the address in I.
	 */
	ld10: function(x) {
		this.log('ld [I], V' + x);
		for (var i = 0; i <= x; i++) {
			this.ram[this.i + i] = this.v[i];
		}
	},

	/**
	 * Fx65 - LD Vx, [I]
	 * Read registers V0 through Vx from memory starting at location I.
	 * The interpreter reads values from memory starting at location I into registers V0 through Vx.
	 */
	ld11: function(x) {
		this.log('ld V' + x + ', [I]');
		for (var i = 0; i <= x; i++) {
			this.v[i] = this.ram[this.i + i];
		}
	}
};

var chip;

window.addEventListener('load', function() {
	var btn = document.getElementById('start');

	chip = chip8.create('canvas');

	btn.addEventListener('click', function (e) {
		var rom = document.getElementById('rom'),
			name = rom.item(rom.selectedIndex).value;

		var xhr = new XMLHttpRequest();

		xhr.open("GET", "roms/" + name, true);
		xhr.responseType = "arraybuffer";

		xhr.onload = function() {
			chip.load(new Uint8Array(xhr.response));
			chip.run();
		};

		xhr.send();
	})
});
