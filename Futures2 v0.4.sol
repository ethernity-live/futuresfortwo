pragma solidity ^0.4.23;

// Financial futures for two
// First participant chooses to vote for a rate of any criptocurrency to increase or decrease over time, 
// and chooses the odds.
// Second participant can bet against him/her, a minimum amount according to the odds sat by the first one.
// Both participants can raise their bets every time they want. If the other participant does not reach the minimum, 
//   the excedent will be returned to the first one, no matter if he wins or loses the bet
// Bets will be closed 15 minutes before the evaluation date.
// Once the time is reached, the current rate will be read and compared to the rate at the beginning.
// The winner will get the total matched bets, minus the fee. If there are an excedent, it will be returned to the one who bet it.

contract Fut2 {
    
    string public ethToUsd;
    event Initiated(string rate, string coin1 , string coin2 , bool up , string odds , uint limit , uint timestamp);
    event Second();
    event Ended(string rate, uint timestamp);
    event Failed();
    event NewBet(bool dir, uint amount);

	// The creator of this futures contract
	address public deployer;
	address public dapp;
	uint public gasPrice;
	// The recipient of the user fee
	address public feeRecipient;
	
	// The numerator and the denominator of the user-fee fraction
	// Doing it this way because of no floating-point numbers available
	uint public feeNum;
	uint public feeDen = 100;
	string public coin1;
	string public coin2;
	bool public ended; // To signal that bet has ended
	
	// Minimum payment to make
	uint public minPayment;
	
	// Amount in the pot
	uint public amountPaid = 0;

	// 0: Waiting for first participant
	// 1: First participant entered. Waiting for second participant
	// 2: Both participants entered

	uint8 public participants;

	// Info for each game
	uint public rate_time;
	uint public dateLimit; // limit to close bet (in milliseconds)
	uint public safeTime = 15 * 60; // Lapse before the closing when bets are closed: 15 minutes
	string public odds; // Odds sat by first bettor (first/second)
	uint public relation = 1; // Odds up/down
	
	// User who chooses the indicator increasing
	address public userIncreasing;
	uint public userIncPayment;
	
	// User who chooses the indicator decreasing
	address public userDecreasing;
	uint public userDecPayment;
	
	// Indicator-value array
	// Each time a value is obtained, it is added to the end
	// This tells us how many have been obtained
	// uint[] public indicatorValues;
	uint public indicator1;
	uint public indicator2;
	
	
	// Set up with user-fee information
	// and the minimum payment
	// If the fee recipient's address is 0, then use the deployer's address
	constructor(address _feeRecipient, address _dapp , uint _feeNum, uint _feeDen, uint _minPayment) {

		deployer = msg.sender; // Deployer address

		// Dapp address. If it is not specified, it will use deployer address
		if (_dapp == 0x0) dapp = msg.sender; 
			else dapp = _dapp;

		// Fee recipient address
		if (_feeRecipient == 0x0) feeRecipient = deployer;
			else feeRecipient = _feeRecipient;
		
		// The fee fraction (numerator / denominator)
		feeNum = _feeNum;
		feeDen = _feeDen;
		
		// Each participant must pay at least this amount
		minPayment = _minPayment;
	}
	
	// Accept payment (this is executed when ethers are sent directly to the contract)
	// This function will be used to increase bets after the two first bet has been made
	function() payable {
		// Require that both particpants has already entered
		require(participants==2);
		pay(msg.sender); // Calls to ths private function
		emit NewBet( (msg.sender==userIncreasing) , msg.value);
	}

	function pay(address _from) private {
		// Require limit time has not been reached
		require(now < dateLimit - safeTime);
		// Require the payer to be one of the participants
		require(_from == userIncreasing || _from == userDecreasing);
		// Stores the total received by contract
		amountPaid += msg.value;
		// Stores amount paid by each participant
		// For paying back in case of a failure.
		if (_from == userIncreasing) userIncPayment += msg.value;
		if (_from == userDecreasing) userDecPayment += msg.value;
	}

	/* Enter as the first participant
	Needs to choose:
	- Pair
	- Direction (true = UP, false = DOWN)
	- Odds ( 0 - 1: odds against bet, > 1: odds favors bet). Odds are received as a string with 4 decimals and are multiplied by 10000 to convert to integer
	- Time to close (unix timestamp)
	*/

	function enterFirst(string _coin1 , string _coin2 , bool dir , string _odds , uint limit , string rate , uint _rate_time) payable {
		// Check that this is the first participant
		require(participants == 0);
		// Check for minimum payment
		require(msg.value >= minPayment);

		// Store at global variables
		// Rate is received as a string with 8 decimals
		rate_time = _rate_time;
		dateLimit = limit;
		odds = _odds;
		coin1 = _coin1;
		coin2 = _coin2;

		// Assign address to respective direction
		if (dir) {
			userIncreasing = msg.sender;
		} else {
				userDecreasing = msg.sender;
				}

		// Indicates 1st participant is present, thus avoiding this function to be executed anymore, because it checks it at beginning
		participants = 1;

		// Stores relation (expressed as up/down) between bet amounts from odds.
		if (dir) {
			relation = parseInt(odds,4) * 1 ether / 10000; // / 10000 because odds are expressed with 4 decimals to integer
			} else {
				relation = 1 ether / parseInt(odds,4) * 10000; // / 10000 because odds are expressed with 4 decimals to integer
				}

		// Account payment
		pay(msg.sender);

		// Add actual rate to the first indicator
        indicator1 = parseInt(rate,8);
        emit Initiated(rate,coin1,coin2,dir,odds,limit,rate_time);

	}
	
	function enterSecond() payable {

		// Check that one (and only one) participant is already present
		require (participants == 1);

		// If down is present, it will give true (up) for this participant.
		// If down is not present, it will give false (down) for this participant.
		bool thisDir = check(false); 

		// Require that participant bets at least the minimum required according to first participant's bet and odds
		require(msg.value >= minToBet(thisDir));

		// Assing participant to the empty slot
		if ( thisDir ) {
			userIncreasing = msg.sender;
			} else {
				userDecreasing = msg.sender;
				}

		// Indicates 2nd  participant is present
		participants = 2;

		// Account payment
		pay(msg.sender);
		emit Second();
	}


	// Ends the contract
	function doPayout(string rate, uint timestamp) {

		// Only accept the payout call from the dapp
        require(msg.sender == dapp);

		// Require that the game is not ended and both present and date reached. Now+600 to allow for differences in miners
		require(!ended && now+600 > dateLimit);

		if (participants < 2) { 
			// If a participant has not entered
			// Refund other participant			
			if (userIncreasing != 0x0) {
				userIncreasing.send(this.balance);
				}
				else {
					userDecreasing.send(this.balance);
					}
			ended = true; // Signals for future tries, if it will not selfdestruct in future versions
			emit Failed();
			// selfdestruct(dapp);
			return;
		}

		// SUCCESS: Do the payout

		// Calculates excess of payment for each user and sends it back to him/her
		if (minToBet(true) < userIncPayment) {
			userIncreasing.send(userIncPayment - minToBet(true));
		}
		if (minToBet(false) < userDecPayment) {
			userDecreasing.send(userDecPayment - minToBet(false));
		}

		// Calculate fee from the remaining balance
		uint fee = feeNum * this.balance / feeDen;

		// Send fee to the fee recipient
		feeRecipient.send(fee);

		// Stores the new rate
        indicator2 = parseInt(rate,8);

		if (indicator2 >= indicator1) {
			userIncreasing.send(this.balance);
		} else {
			userDecreasing.send(this.balance);
		}

		ended = true; // Signals for future tries, if it will not selfdestruct in future versions
        emit Ended(rate,dateLimit); 
        // selfdestruct(dapp); 
        return;
	}


	// GETTERS (to retrieve info)

	// Is someone already present for some direction?
	function check(bool dir) constant returns (bool) {
		if (dir) {
			return (userIncreasing != 0x0);
		} else {
			return (userDecreasing != 0x0);
		}
	}


	function betsStatus() constant returns(bool balanced, uint minInc, uint minDec) {
		return(isBalanced() , minToBet(true) , minToBet(false) );
	}

	// Check if bets are balanced according to odds
	function isBalanced() constant returns(bool) {
		return ( userIncPayment == minToBet(true) && userDecPayment == minToBet(false) );
	}

	// How much has each participant paid?
	function howMuchPaid(bool dir) constant returns (uint) {
		if (dir) return userIncPayment;
		else return userDecPayment;
	}

	// Returns minimum to bet for each side to match the bet, having in account the odds
	function minToBet(bool dir) constant returns(uint) {
		if (dir) {
			return((userDecPayment * relation) / 1 ether);
			} else {
				return((userIncPayment * 1 ether) / relation);
				}
	}

	// Not used in this version. Returns both rates, first and second, if it exist.
	function getIndicatorAtIndex(uint8 indx) constant returns (uint) {
		if (indx == 0 ) return indicator1;
			else return indicator2;
	}


	// Two following functions will return a set of values of the bet, to inform to the dApp at different stages

	function getValuesSecc1() constant returns(
		uint8 _participants,
		uint _feeNum,
		uint _feeDen,
		uint _minPayment) {
		return(participants,feeNum,feeDen,minPayment);
	}

	function getValuesSecc2() constant returns(
		address _userIncreasing,
		address _userDecreasing,
		uint _userIncPayment,
		uint _userDecPayment,
		string _coin1,
		string _coin2,
		uint _amountPaid,
		string _odds,
		uint _rate_time,
		uint _dateLimit,
		uint _rate) {
		return(
			userIncreasing,
			userDecreasing,
			userIncPayment,
			userDecPayment,
			coin1,
			coin2,
			amountPaid,
			odds,
			rate_time,
			dateLimit,
			indicator1);
	}

    // parseInt(parseFloat*10^_b)
    // From:
    // https://github.com/oraclize/ethereum-api/blob/master/oraclizeAPI_0.5.sol
    // Copyright (c) 2015-2016 Oraclize SRL
	// Copyright (c) 2016 Oraclize LTD
	// 
	// Converts a string into an integer, with _b decimals converted to integer

    function parseInt(string _a, uint _b) internal pure returns (uint) {
        bytes memory bresult = bytes(_a);
        uint mint = 0;
        bool decimals = false;
        for (uint i=0; i<bresult.length; i++){
            if ((bresult[i] >= 48)&&(bresult[i] <= 57)){
                if (decimals){
                   if (_b == 0) break;
                    else _b--;
                }
                mint *= 10;
                mint += uint(bresult[i]) - 48;
            } else if (bresult[i] == 46) decimals = true;
        }
        if (_b > 0) mint *= 10**_b;
        return mint;
    }

}
