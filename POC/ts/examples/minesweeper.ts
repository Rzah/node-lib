import { Keyboard, KeyInfo, KeyState } from "../../../src";
import { allColor } from "./all-color";

var debug_neighbours:boolean = false; // use to debug get_neighbours code, highlights a keys neighbours
var started: boolean = false;
var mines: number[] = []; // KeyID's of mine keys
var Lookup: number[] = []; // ref of KeyID's to keys
var LookupName: string[] = []; 
var locale: any;
var keeb: Keyboard;
var minefield: number[] = []; // KeyID's of entire minefield
var minefield_counts: number[] = []; // lookup array for number of surrounding mines
var checked: number[] = []; // KeyID's of keys that have already been processed per game
var flags: number[] = []; // KeyID's of flagged mines
var safePlaces: number[] = []; // KeyID's of keys that are not mines, keys removed as pressed / checked
var mineCount:number = 6; // number of mines for first game, incemented if game won, decremented if game lost
var lastMineCount:number = 8; // number of mines indicated on F keys, this records the previous number so the key can be reset
var flagging:boolean = false; // global mode for flagging
var game_end:boolean = false; // global mode for game finished (win/lose)
var exploding:boolean = false;
var neighbours: any = {};
var explosion_arrays: any = []; // 2D array of key ids in waves out from mines

// colour refs for indicating surrounding mines
var unknownmine:string = "#0F0F0F";
var noMine:string = '#00FF00';
var oneMine:string = '#0000FF';
var twoMine:string = '#0A91D1'; // 0A91D1
var threeMine:string = '#B8DA02'; // 37DA02
var fourMine:string = '#DA4800'; // B8DA02
var fiveMine:string = '#DA0005'; // DA4800
var sixMine:string = '#FF00FF'; // DA0005

var flaggedMine:string = "#FF0000";

function makeMinefield() {
	// create array of minefield key ID's
	for (var i = 50; i < 62; i++) {
		minefield.push(i);
	}
	for (var i = 74; i < 86; i++) {
		minefield.push(i);
	}
	for (var i = 99; i < 110; i++) {
		minefield.push(i);
	}
	minefield.push(111);
	for (var i = 123; i < 133; i++) {
		minefield.push(i);
	}
}

function layMines(keyID:number) {
	console.log('laying ' + mineCount + ' mines...');
	var temp  = minefield.slice(0);
	mines = [];
	minefield_counts = [];
	for (var i = 133 - 1; i >= 0; i--) {
		minefield_counts[i] = 0;
	}
	
	temp.splice(temp.indexOf(keyID), 1); // remove initial keypress
	for (var i = 0; i < mineCount; i++) { // randomly pick mines
		var mine = temp[Math.floor(Math.random()*temp.length)];
		mines.push(mine);
		temp.splice(temp.indexOf(mine), 1); // remove random pick
	}
	safePlaces = Object.assign([], temp);
	safePlaces.push(keyID);
	
	// precalc explosion ids
	explosion_arrays = [];

	explosion_arrays.push(mines);
	var all_tiles = Object.assign([], temp);
	var current_tiles = Object.assign([], mines);
	var used_tiles = Object.assign([], mines);
	var anchor: number = 0;
	while ((all_tiles.length >= 1)&&(anchor < 20)) {
		temp = [];
		anchor++;
		for (var i = 0; i < current_tiles.length; i++) {
			var temp2 = get_neighbours(current_tiles[i]);
			for (var j = 0; j < temp2.length; j++) {
				if (used_tiles.indexOf(temp2[j]) == -1) {
					temp.push(temp2[j]);
					all_tiles.splice(all_tiles.indexOf(temp2[j]), 1);
					used_tiles.push(temp2[j]);
				}
			}
		}
		explosion_arrays.push(temp);
		current_tiles = Object.assign([], temp);
	}

	// seed minecount lookup array
	for (var i = 0; i < mines.length; i++) {
		// get surrounding tiles
		temp = get_neighbours(mines[i]);
		for (var j = 0; j < temp.length; j++) {
			minefield_counts[temp[j]]++;
		}
	}

	console.log('minefield ready for clearance!');
	// console.log(minefield.length);
	// console.log(mines);
	// console.log(safePlaces.length);
	// console.log(minefield_counts);
}

function indicate_number_of_mines_on_function_keys() {
	
	if (lastMineCount != mineCount) {
		// reset previous mineCount key
		if (lastMineCount <= 4) {
			var lastnudge = 26;
		} else {
			var lastnudge = 27;
		}
		var key = KeyInfo["en-GB"][locale[Lookup[lastMineCount + lastnudge]]];
		// console.log('clearing old mine indicator: ',key);
		keeb.setKeyState(new KeyState(key)
			.setToColorHex(unknownmine)
			.setUpIncrement(10)
			.setUpIncrementDelay(0)
			.setMoveUp()
			.setApplyDelayed()
		)	
	}

	// indicate mineCount, nudge is used to jump over missing keyID between F4 & F5
	if (mineCount <= 4) {
		var nudge = 26;
	} else {
		var nudge = 27;
	}
	var key = KeyInfo["en-GB"][locale[Lookup[mineCount + nudge]]];
	// console.log('setting new mine indicator: ',key);
	keeb.setKeyState(new KeyState(key)
		.setToColorHex('#FF0000')
		.setUpIncrement(10)
		.setUpIncrementDelay(0)
		.setMoveUp()
		.setApplyDelayed()
	)
	lastMineCount = mineCount;
	keeb.apply();
}

function winner() {
	for (var i = 0; i < minefield.length; i++) {
		var to_color = noMine;
		if (mines.indexOf(minefield[i]) > -1) {
			to_color = "#FFFFFF";
		}
		var key = KeyInfo["en-GB"][locale[Lookup[minefield[i]]]];
		keeb.setKeyState(new KeyState(key)
			.setToColorHex(to_color)
			.setUpIncrement(5)
			.setUpIncrementDelay(1)
			.setMoveUp()
			.setApplyDelayed()
		)
	}
	keeb.apply();
}

function clearField(ignore_mines: boolean = false) {
	for (var i = 0; i < minefield.length; i++) {
		if ((ignore_mines)&&(mines.indexOf(minefield[i]) > -1)) {
			continue;
		}
		var key = KeyInfo["en-GB"][locale[Lookup[minefield[i]]]];
		keeb.setKeyState(new KeyState(key)
			.setToColorHex(unknownmine)
			.setMoveUp()
			.setApplyDelayed()
		)
	}
	
	mines = [];
	checked = [];
	flags = [];
	safePlaces = [];
	game_end = false;
	keeb.apply();
}

function get_neighbours(keyID:number) {
	// returns an array of neighbouring key ID's running clockwise: [left, aboveleft, aboveright, right, rightbelow, leftbelow] any keys outside of the minefield are dropped.
	if (neighbours['key' + keyID]) {
		var surroundings = neighbours['key' + keyID];
		// console.log('cache hit for ', keyID, surroundings);
	} else {
		// console.log('no cache for ', keyID);
		if (keyID < 73) {
			var burbs = [keyID -1, keyID - 25, keyID - 24, keyID + 1, keyID + 24, keyID + 23,];
		} else if ((keyID >= 99)&&(keyID < 109)) {
			var burbs = [keyID -1, keyID - 25, keyID - 24, keyID + 1, keyID + 24, keyID + 23,];
		} else if (keyID == 109) {
			var burbs = [keyID -1, keyID - 25, keyID - 24, keyID + 2, keyID + 24, keyID + 23,];
		} else if (keyID == 111) {		
			var burbs = [keyID -2, keyID - 26, keyID - 24, keyID + 1, keyID + 24, keyID + 23,];
		} else if ((keyID >= 112)&&(keyID < 122)) {
			var burbs = [keyID -1, keyID - 25, keyID - 24, keyID + 1, keyID + 24, keyID + 23,];	
		} else if (keyID == 85) {
			var burbs = [keyID -1, keyID - 23, keyID - 24, keyID + 1, keyID + 26, keyID + 24,];
		} else {
			var burbs = [keyID -1, keyID - 24, keyID - 23, keyID + 1, keyID + 25, keyID + 24,];
		}
		
		var surroundings: any = [];
		
		for (var i = burbs.length - 1; i >= 0; i--) {
			if (minefield.indexOf(burbs[i]) > -1) {
				surroundings.push(burbs[i]);
			}
		}
		neighbours['key' + keyID] = surroundings;
	}

	return surroundings;
}

function highlight_neighbours(keyID:number) {
	// highlights surrounding keys, enable debug_neighbours to use.
	console.log('pressed: ' + keyID);
	var burbs: number [] = get_neighbours(keyID);

	// highlight keys
	for (var i = 0; i < burbs.length; i++) {

		var key = KeyInfo["en-GB"][locale[Lookup[burbs[i]]]];
		var to_color = "#00FFFF";

		if (minefield.indexOf(burbs[i]) > -1) {
			keeb.setKeyState(new KeyState(key)
				.setToColorHex(to_color)
				.setUpIncrement(1)
				.setUpIncrementDelay(0)
				.setMoveUp()
				.setApplyDelayed()
			)
		}
	}
	keeb.apply();

	setTimeout( // return to default after 1.2s
		function(){ 
			for (var i = 0; i < burbs.length; i++) {

				var key = KeyInfo["en-GB"][locale[Lookup[burbs[i]]]];
				var to_color = unknownmine;
				
				if (minefield.indexOf(burbs[i]) > -1) {
					keeb.setKeyState(new KeyState(key)
						.setToColorHex(to_color)
						.setDownDecrement(1)
						.setDownDecrementDelay(0)
						.setMoveDown()
						.setApplyDelayed()
					)
				}
			}
			keeb.apply();
		}, 1200);
}

function exploder() {
	var delay: number = 0;
	var colours: any = ["#FF0000", "#110000", "#000033", "#003300", "#000099", "#009900", "#222222", "#005555", "#660066", "#123456", "#987654", "#00562"]

	for (var i = 0; i < explosion_arrays.length; i++) {
		var DownHoldDelay = 5000;
		if (i == 0) { // the actual mines
			var fromColor = "#FF0000";
			var to_color = '#FF0000'; 
		} else {
			var fromColor = unknownmine;
			var to_color = '#FF8C00';
		}

		for (var h = 0; h < explosion_arrays[i].length; h++) {
			
			var key = KeyInfo["en-GB"][locale[Lookup[explosion_arrays[i][h]]]];
			// console.log(ffs, test, ki[Lookup[minefield[i]]], to_color);
			keeb.setKeyState(new KeyState(key)
				.setToColorHex(to_color)
				.setFromColorHex(fromColor)
				.setDownMinimum(fromColor)
				.setDownDecrement(1)
				.setUpIncrement(10)
				.setUpIncrementDelay(1)
				.setDownDecrementDelay(2)
				.setUpHoldDelay(10)
				.setDownHoldDelay(DownHoldDelay)
				.setTransitionReverse()
				.setStartDelay(delay)
				.setApplyDelayed()
			)
		}
		delay = delay + 10;
	}
	keeb.apply();
	mineCount--; // decrement number of mines on a lose
	setTimeout( // stop reflash on non mines after they fade out
		function(){ 
			clearField(true);
		}, 10000);
}

function flag(keyID:number) {
	
	if (flags.indexOf(keyID) > -1) {
		// unflag
		var key = KeyInfo["en-GB"][locale[Lookup[keyID]]];
		flags.splice(flags.indexOf(keyID), 1);
		var to_color = unknownmine;
		keeb.setKeyState(new KeyState(key)
			.setToColorHex(to_color)
			.setMoveUp()
			.setApplyDelayed()
		)
	} else {
		// flag
		flags.push(keyID);
		var to_color = flaggedMine;
		for (var i = 0; i < flags.length; i++) {
			var key = KeyInfo["en-GB"][locale[Lookup[flags[i]]]];
			keeb.setKeyState(new KeyState(key)
				.setToColorHex(to_color)
				.setFromColorHex(unknownmine)
				.setUpIncrement(10)
				.setUpIncrementDelay(0)
				.setDownDecrement(10)
				.setDownDecrementDelay(0)
				.setUpHoldDelay(80)
				.setDownHoldDelay(10)
				.setTransitionReverse()
				.setStartDelay(5)
				.setApplyDelayed()
			)	
		}
	}
	
	
	keeb.apply();
}

function checkNeighbours(keyID:number) {
	// console.log('checking around '+keyID);
	if ((game_end)||(checked.indexOf(keyID) > -1)) {
		return;
	}
	checked.push(keyID);
	var burbs: number [] = get_neighbours(keyID);
	var danger: number = 0;
	var todo: number[] = [];
	danger = minefield_counts[keyID];

	// console.log(burbs);
	for (var i = 0; i < burbs.length; i++) {
		if (checked.indexOf(burbs[i]) == -1) {
			todo.push(burbs[i]);
		}
	}

	var tilecolor: string;
	switch (danger) {
		case 1: {
			tilecolor = oneMine;
			break;
		}
		case 2: {
			tilecolor = twoMine;
			break;
		}
		case 3: {
			tilecolor = threeMine;
			break;
		}
		case 4: {
			tilecolor = fourMine;
			break;
		}
		case 5: {
			tilecolor = fiveMine;
			break;
		}
		case 6: {
			tilecolor = sixMine;
			break;
		}
		default: {
			tilecolor = noMine;
			break;
		}
	}
	// console.log(locale[Lookup[burbs[i]]]);
	var key = KeyInfo["en-GB"][locale[Lookup[keyID]]];
	// console.log(danger, tilecolor);
	keeb.setKeyState(new KeyState(key)
		.setToColorHex(tilecolor)
		.setMoveUp()
		.setApplyDelayed()
	)
	safePlaces.splice(safePlaces.indexOf(keyID), 1);
	// console.log('removing ', keyID, ' SP: ', safePlaces.length);
	if (danger == 0) {
		for (var i = 0; i < todo.length; i++) {
			checkNeighbours(todo[i]);
		}
	}
	if ((safePlaces.length == 0)&&(!game_end)) {
		game_end = true;
		winner();
		console.log('Minefield cleared! press return to play again');
		mineCount++; // increment total number of mines
	}
	// console.log(minefield_counts[keyID]);
}

export function minesweeper(keyboard: Keyboard, region: string) {
	// locale = region;
	keeb = keyboard;
	if (region == 'uk') {
		locale = Object.keys(KeyInfo["en-GB"]);
	} else {
		locale = Object.keys(KeyInfo["en-US"]);
	}
	// build lookup arrays of ID to keyIndex and keyname to ID
	
	for (var i = 0; i < 215; i++) {
		Lookup.push(215);
		LookupName.push('undefined');
	}
	for (var i = locale.length - 1; i >= 0; i--) { // cache led_ID => ki[?]
		let temp = KeyInfo["en-GB"][locale[i]].ledIds[0].id;
		Lookup[temp] = i;
		let temp2 = KeyInfo["en-GB"][locale[i]].shortName;
		switch (temp2) {
			case "comma": {
				temp2 = ",";
				break;
			}
			case "period": {
				temp2 = ".";
				break;
			}
			case "semiColon": {
				temp2 = ";";
				break;
			}
			case "singleQuote": {
				temp2 = "'";
				break;
			}
			case "backSlash": {
				temp2 = "\\";
				break;
			}
			case "forwardSlash": {
				temp2 = "/";
				break;
			}
			case "dash": {
				temp2 = "-";
				break;
			}
			case "equalSign": {
				temp2 = "=";
				break;
			}
		}
		LookupName[temp] = temp2;
	}
	// console.log(Lookup);
	// console.log(LookupName);

	if (!started) {
		console.log('INIT MINESWEEPER');
		console.log('');
		console.log('number of surrounding mines indicated by color, as indicated on numberpad');
		console.log('');
		console.log('space bar toggles flagging mode, press a grey (minefield) key to start');
		console.log('');
		allColor(keyboard, "#000000"); // set keyboard to black (off)
		makeMinefield();
		clearField();
		indicate_number_of_mines_on_function_keys();
		// set legend on numberpad
		var legend:string[] = [noMine, oneMine, twoMine, threeMine, fourMine, fiveMine, sixMine];
		var pads:number[] = [164, 139, 140, 141, 115, 116, 117];
		for (var i = 0; i < 7; i++) {
			var key = KeyInfo["en-GB"][locale[Lookup[pads[i]]]];
			keeb.setKeyState(new KeyState(key)
				.setToColorHex(legend[i])
				.setMoveUp()
				.setApplyDelayed()
			)
		}
		
		const readline = require('readline');
		readline.emitKeypressEvents(process.stdin);
		// @ts-ignore
		process.stdin.setRawMode(true);
		process.stdin.on('keypress', (str, key) => {
			// console.log('got ', key);
			// console.log('seq: ', key.sequence);
			if (key.ctrl && key.name === 'c') {
				console.log('quitting');
				process.exit();
			} else if (key.name == 'return') {
				console.log(`starting new game`);
				clearField();
				indicate_number_of_mines_on_function_keys();
				minesweeper(keyboard, region);
			} else if (key.name == 'space') {
				var spacekey = KeyInfo["en-GB"][locale[Lookup[151]]];
				if (!flagging) {
					// console.log('flag mode ON');
					flagging = true;
					keeb.setKeyState(new KeyState(spacekey)
						.setToColorHex(flaggedMine)
						.setMoveUp()
						.setApplyDelayed()
					)
				} else {
					// console.log('flag mode OFF');
					flagging = false;
					keeb.setKeyState(new KeyState(spacekey)
						.setToColorHex(unknownmine)
						.setMoveUp()
						.setApplyDelayed()
					)
				}
				keeb.apply();
				// var test = LookupName.indexOf(str.toUpperCase());
				// flag(test);
				// console.log(test, 'ctrl + '+ str);
			} else {
			    var test = LookupName.indexOf(str.toUpperCase());
			    
			    if (test > -1) {
			    	if (!mines.length) {
				    	layMines(test);
				    }
			    	// console.log(ki[Lookup[test]]);
			    	if (flagging) {
			    		flag(test);
			    	} else {
			    		if (debug_neighbours) {
			    			highlight_neighbours(test);	
			    		} else {
			    			if (mines.indexOf(test) > -1) {
			    				// stepped on a mine!
					    		exploder();
					    		console.log('BOOM!! press return key to restart')
					    	} else {
					    		// console.log(str + ' is safe');
					    		checkNeighbours(test);
					    		keeb.apply();
					    	}
			    		}
			    	}
			    }
			}
		});
		started = true;
	}
	
	// set minefield
	for (var i = 0; i < minefield.length; i++) {
		var key = KeyInfo["en-GB"][locale[Lookup[minefield[i]]]];
		var to_color = unknownmine;
		// console.log(ffs, test, ki[Lookup[minefield[i]]], to_color);
		keyboard.setKeyState(new KeyState(key)
			.setToColorHex(to_color)
			.setMoveUp()
			.setApplyDelayed()
		)
	}

	
}
