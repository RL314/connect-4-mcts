const stateGrid = []; // stores game state
const domGrid = [];		// stores DOM elements that represent the game state

window.onload = function(){
	const gameBoard = document.getElementById("game-board");
	const newGameBtn = document.getElementById("new-game-btn");
	
	(function initiateGrid(){
		const slotContainerTemplate = document.querySelector(".slot-container");
		const docFrag = document.createDocumentFragment();
		for(let x = 0; x < 7; x++){
			stateGrid.push([]);
			domGrid.push([]);
			for(let y = 5; y >= 0; y--){
				stateGrid[x][y] = null;
				
				let slotContainerClone = slotContainerTemplate.cloneNode(true);
				docFrag.appendChild(slotContainerClone);
				domGrid[x][y] = slotContainerClone.querySelector("circle");
				domGrid[x][y].dataset.x = x;
				domGrid[x][y].dataset.y = y;
			}
		}
		gameBoard.appendChild(docFrag);
	})();
	(function initiatePseudoHover(){
		gameBoard.addEventListener("mouseover", uiH.mouseoverCallback);
	})();
	(function initializeGameBoardClick(){
		gameBoard.addEventListener("click", function(e){
			// (1) play only on slots and on player's turn
			if(!e.target.classList.contains("slot")) return;
			if((gameH.activePlayer() !== 0)) return;
			//     prevent double aclicking by accident
			//if(!clickActive) return;
			//clickActive = false;
			//setTimeout(() => {clickActive = true;}, 800);
			
			// (2) play only on empty slots 
			if(e.target.dataset.occupant !== "null"){
				console.log("Slot already taken! Please choose another. ");
				return;
			}
		
			// (3) play then, on the bottom-most slot
			if(e.target.dataset.occupant === "null"){
				let x = Number(e.target.dataset.x);
				let y = gameH.columnBottomEmptyY(x);
				gameH.playBoard([x,y], 0); 
			}
		});
	})();
	(function initiateNewGameBtn(){
		newGameBtn.addEventListener("click", function(){
			gameH.newGameFunctions();
			uiH.updateMCTSdisplay();
		});
	})();
	(function initiateMCTScomplete(){
		window.addEventListener("MCTScomplete", function(e){
			// (1) play the move
			gameH.playBoard(e.move);
			// (2) render pseudo-hover
			let e_hover = new Event("mouseover", {bubbles: true});
			uiH.hoverTarget().dispatchEvent(e_hover);
			// (3) render MCTS displays
			uiH.updateMCTSdisplay(e.rootNode);
		});
	})();
	
	newGameBtn.click();
}

//uiHandler ------------------------------------------------------------
const uiH = (function(){
	// (A) hover
	let hoverTarget = window;
	let pseudoTarget;
	function mouseoverCallback(e){
		// (1) un-hover old target
		pseudoTarget?.classList?.remove("pseudoHover");
		// (2) set new target
		hoverTarget = e.target;
		// (3) hover new target
		if(hoverTarget.classList.contains("slot")){
			const x = Number(hoverTarget.dataset.x);
			const y = Number(hoverTarget.dataset.y);
			let y_ = Math.min(y, gameH.columnBottomEmptyY(x));
			pseudoTarget = domGrid[x][y_];
			if(gameH.activePlayer() === 0) pseudoTarget.classList.add("pseudoHover");
		}
	}
	
	// (B) mctsDisplay
	const MCTSdisplays = (function(){
		let displays = [];
		let frag = document.createDocumentFragment();
		for(let col = 0; col < 7; col++){
			let display = document.createElement("div");
			display.classList.add("mctsDisplay");
			display.column = col;
			display.classList.add("displayNone");
			
			displays[col] = display;
			frag.appendChild(display);
		}
		document.body.appendChild(frag);
		return displays;
	})();
	const showMCTSinput = document.getElementById("show-MCTS-result");
	function updateMCTSdisplay(rootNode){
		// (1) remove displays from view
		emptyMCTSdisplay();
		
		if(rootNode === undefined) return;
		if(showMCTSinput.checked !== true) return;
		
		const legalMoves = Array.from(rootNode.map.keys());
		for(let col = 0; col < 7; col++){
			let display = MCTSdisplays[col];
			// (2) get row and col
			const move = legalMoves.find((legalMove) => legalMove[0] === col);
			if(move === undefined) continue;
			// (3) set display's innerText
			let childNode = rootNode.map.get(move);
			display.innerText = `${childNode.w}/${childNode.s}`;
			// (4) append to right slot
			let slotContainer = domGrid[col][move[1]].closest(".slot-container");
			slotContainer.appendChild(display);
			display.classList.remove("displayNone");
		}
	}
	function emptyMCTSdisplay(){
		for(let col = 0; col < 7; col++){
			MCTSdisplays[col].classList.add("displayNone");
		}
	}
	
	return{
		hoverTarget: () => hoverTarget, 
		mouseoverCallback, 
		
		updateMCTSdisplay, 
	}
})();

//gameHandler ----------------------------------------------------------
const gameH = (function(){
	let activePlayer = 0; // 0 for player, 1 for AI
	let legalMoves = [];
	
	function playState(xy, state, player){
		const [x, y] = xy;
		state[x][y] = player;
		
		return state;
	}
	function playBoard(xy, player=activePlayer){
		const [x, y] = xy;
		
		let winner = checkWinner(stateGrid, xy, player);
		domGrid[x][y].dataset.occupant = player;
		playState(xy, stateGrid, player);
		if(winner !== null){
			const winnerString = winner === 0? "You" : "The AI";
			alert(`${winnerString} won!`);
			return;
		}
		updateLegalMoves(xy, legalMoves);
		
		// (a) if gameBoard is full, it's a draw
		if(legalMoves.length === 0){
			alert("Draw!");
			return;
		}
		
		// switch turn
		activePlayer = nextPlayer(activePlayer);
		if(activePlayer === 1) aiMove(); 
	}
	function aiMove(){
		mctsH.search(stateGrid, activePlayer, legalMoves);
	}
	
	function resetGrid(){
		for(let x = 0; x < 7; x++){
			for(let y = 0; y < 6; y++){
				stateGrid[x][y] = null;
				domGrid[x][y].dataset.occupant = null;
			}
		}
	}
	function resetLegalMoves(){
		legalMoves = [];
		for(let x = 0; x < 7; x++){
			legalMoves.push([x, 0]);
		}
	}
	function resetActivePlayer(){
		activePlayer = Number(document.querySelector("input[name='first-move']:checked").value);
		if(activePlayer === 1) aiMove();
	}
	
	function computeLegalMoves(state){
		let legalMoves = [];
		for(x = 0; x < 7; x++){
			for(let y = 0; y < 6; y++){
				if(state[x][y] === null){
					legalMoves.push([x, y]);
					break;
				}
			}
		}
		return legalMoves;
	}
	function updateLegalMoves(xy, legalMoves_){
		// (1) the taken move is no longer legal (note indexOf() compares the arrays instead of array values )
		const [x, y] = xy;
		const moveIdx = legalMoves_.findIndex( (xy_) => xy_[0] === x &&
																										xy_[1] === y ); 
		// (2a) if y+1 is on the board, replace
		if(y < 5){
			legalMoves_[moveIdx] = [x, y+1];
		}
		// (2b) if y+1 is out of board, simply remove
		else{
			legalMoves_.splice(moveIdx, 1);
		}
	}
	function checkWinner(state, xy, player){
		// state is the current gridState, which we are checking, BUT
		// x, y are coordinates of the last move, we only have to check if the last move has connected four
		// player is the player last played,  we only have to check for them
		const [x, y] = xy;
		const checkSteps = [[-1,-1], [0,-1], [1,-1], [-1,0]]; // 4 -ve directions
		let connected = 1;
		let j = 1; 																						// 1 or -1 <=> -ve and +ve directions
		
		loopDirection: for(const checkStep of checkSteps){
			connected = 1;
			j = 1;
			
			// after counting connected in the positive direction, also have to count in the negative direction
			loopNegative: for(let n = 0; n < 2; n++){
			
				loopMultiple: for(i = 1; i < 4; i++){
					const x1 = x + checkStep[0] *i*j; // we do not want stateGrid[-1] be stateGrid[6]
					const y1 = y + checkStep[1] *i*j;			
					// (a) if the slot is out-of-board or if occupant is not player --> check another direction
					if(state[x1] === undefined || state[x1][y1] !== player) break;
					// (b) 
					connected++;
					if(connected === 4) return player;
				}
				
				j = -1;
			}		
		}
		return null; //return null victor
	}
	function nextPlayer(player){
		return (player+1) % 2;
	}
	function columnBottomEmptyY(x){
		for(let y = 0; y < 6; y++){
			if(stateGrid[x][y] === null) return y;
		}
	}
	
	return{
		activePlayer: () => activePlayer, 
		
		playState, playBoard, 
		newGameFunctions: function(){
			resetGrid(); 
			resetLegalMoves();
			resetActivePlayer();
		}, 
		computeLegalMoves, updateLegalMoves, checkWinner, nextPlayer, columnBottomEmptyY, 
	};
})();

const mctsH = (function(){
	let s_init = 2; // nodes start with this many wins (optimistic)
	// searches terminate after T ms; the search is divided in sessions of N-many episodes
	let rootNode;
	let nodeSets;
	let t_start;
	const T = 1500;
	const N = 2000; 
	let n_total = 0;
	
	class RootNode{
		constructor(state, activePlayer, legalMoves=null){
			this.state = state;
			this.activePlayer = activePlayer;
			this.depth = 0;
			
			legalMoves = legalMoves ?? computeLegalMoves(state);
			this.map = new MoveMapNode(legalMoves);
			this.s = this.map.size * s_init;
			this.w = this.s;
			this.winner = null;
		}
	}
	class ChildNode{
		constructor(parentNode, move){
			const s = parentNode.state;
			const p = parentNode.activePlayer;
			this.state = playState(move, cloneState(s), p);
			this.activePlayer = nextPlayer(p);
			this.parentNodes = new Set([parentNode]);
			this.dpeth = parentNode.depth + 1;
			
			this.map = new MoveMapNode(computeLegalMoves(this.state));
			this.s = s_init;
			this.w = s_init; // no points for a draw
			
			this.winner = checkWinner(this.state, move, p);
		}
		
		ucb1(t){ // ln(t^-4)
			/* U(t) = sqrt(-ln(p) / 2*N(a)), 
				 for fair comparison between legalMoves, we must use the same p; an onvious choice is parent.s
			*/
			return this.gain + Math.sqrt(2 * Math.log(t) / this.s);
		}
	}
	Object.defineProperty(ChildNode.prototype, "gain", {
		get(){
			return this.w / this.s;
		}
	});
	class MoveMapNode extends Map{
		constructor(legalMoves){
			super();
			for(let move of legalMoves){
				this.set(move, null);
			}
		}
	}
	class NodeSets{
		constructor(){
			
		}
		
		nodeOfState(s1, depth){
			// depth is depth of s1 in the current search tree. In Connect Four each move, and thus depath, adds exactly one game piece
			// (a) new search depth
			if(this[depth] === undefined) return undefined;
			
			for(let node of this[depth].values()){
				// (b) check stateGrid
				if(compareStates(s1, node.state)) return node;
			}
			return null;
		}
		add(node, depth){
			if(this[depth] === undefined) this[depth] = new Set();
			this[depth].add(node);
		}
	}
	
	function search(state, activePlayer, legalMoves){
		rootNode = new RootNode(state, activePlayer);
		nodeSets = new NodeSets();
		t_start = performance.now();
		n_total = 0;
		
		search_session();
	}
	function search_session(){
		// (1a) query next session
		if(performance.now() - t_start < T){
			setTimeout(search_session, 0, rootNode);
		}
		// (1b) 'return' result
		else{
			let gainBest = -Infinity;
			let moveBest;
			for(let [move, childNode] of rootNode.map.entries()){
				if(childNode.gain > gainBest){
					gainBest = childNode.gain;
					moveBest = move;
				}
			}
			let e = new Event("MCTScomplete");
			e.gain = gainBest;
			e.move = moveBest;
			e.epis = n_total;
			e.rootNode = rootNode;
			window.dispatchEvent(e);
			console.log(`AI played [${e.move}], over ${performance.now() - t_start} ms, simulated ${n_total} games. `);
		}
		// (2) main loop
		for(let n = 0; n < N; n++){
			let leafNode = selection(rootNode);
			let newNode = expansion(leafNode, nodeSets);
			let winner = simulation(newNode);
			backpropagation(newNode, winner);
		}
		n_total += N;
	}
	
	function selection(parentNode){
		let ucbBest = -Infinity;
		let nodeBest;
		// (a) if leaf node, return it
		for(let childNode of parentNode.map.values()){
			if(childNode === null) return parentNode;
			// (b) if not, try selection on childNode with greatest UCB1
			let ucb = childNode.ucb1(parentNode.s);
			if(ucb > ucbBest){
				ucbBest = ucb;
				nodeBest = childNode;
			}
		}
		return selection(nodeBest);
	}
	function expansion(leafNode, nodeSets){
		// (a) if leafNode wins the game, do not expand -> simply choose the move
		if(leafNode.winner !== null) return leafNode;
		// (b)
		for(let [move, childNode] of leafNode.map.entries()){
			if(childNode === null){
				
				let s1 = playState(move, cloneState(leafNode.state), leafNode.activePlayer);
				let depth1 = leafNode.depth+1;
				// (a) if s1 already exists in nodeSets (is nonetheless NEW to the search tree structure)
				// (b) if s1 is new
				let newNode = nodeSets.nodeOfState(s1, depth1) ??
											new ChildNode(leafNode, move);
				
				leafNode.map.set(move, newNode);
				newNode.parentNodes.add(leafNode);
				nodeSets.add(newNode);
				return newNode;
			}
		}
	}
	function simulation(newNode){
		// (a) skip simulation if newNode itself is winning
		if(newNode.winner !== null) return newNode.winner;
		
		// (b) return a draw if newNode has no legalMoves
		if(newNode.map.size === 0) return null;
		
		// (c) run simulation, return winner
		let state = cloneState(newNode.state);
		let legalMoves = Array.from(newNode.map.keys()); 
		let activePlayer = newNode.activePlayer;
		
		while(legalMoves[0]){
			// (1) pick a random legal move
			let move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
			// (2) playState; if anyone wins, return the winner
			playState(move, state, activePlayer);
			let winner = checkWinner(state, move, activePlayer);
			if(winner !== null) return activePlayer;
			// (3) switch turn
			updateLegalMoves(move, legalMoves);
			activePlayer = nextPlayer(activePlayer);
		}
		
		// (d) if draw, return null
		return null;
	}
	function backpropagation(node, winner){
		// (1) node.s, node.w +
		node.s += 1;
		node.w += Number(winner === lastPlayer(node.activePlayer));
		
		// (a) reach rootNode, cease propagation
		if(node === rootNode) return;
		// (b) else back-propagate
		for(let parentNode of node.parentNodes.values()){
			backpropagation(parentNode, winner);
		}
	}
	
	function compareStates(a1, a2){
		let X = a1.length;
		let Y = a1[0].length;
		
		xLoop: for(let x = 0; x < X; x++){
			yLoop: for(let y = 0; y < Y; y++){
				if(a1[x][y] !== a2[x][y]) return false;
				if(a1[x][y] === null) continue xLoop; // supposedly all slots above an empty slot are empty
			}
		}
		return true;
	}
	
	const cloneState = utils.clone2dArray;
	const {playState, computeLegalMoves, updateLegalMoves, checkWinner, nextPlayer} = gameH;
	const lastPlayer = nextPlayer;
	
	return{
		search,  
	};
})();




