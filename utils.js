const utils = (function(){
	function clone2dArray(array2d){
		let clone = [];
		for(let array1d of array2d){
			clone.push( [...array1d] );
		}
		return clone;
	}
	
	return{
		clone2dArray, 
	}
})();