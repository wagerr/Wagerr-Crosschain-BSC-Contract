pragma solidity ^0.8.0;
import "./IBEP20.sol";
import "./openzeppelin/SafeBEP20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IPancakeRouter.sol";

contract BettingV4 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeBEP20 for IBEP20;
    IBEP20 private token;
    uint256 public betIndex;

    mapping(string => address) public Coins;
    mapping(string => uint256) public totalBets;
    mapping(string => uint256) public totalRefunds;
    mapping(string => uint256) public totalPayout;

    address private PANCAKESWAP_ROUTER;

    address private constant WBNB = 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd;
    address private constant BWGR = 0xFA2Dfd4f223535E0780d8e17e43B97d23AAB88a9;

    function initialize(IBEP20 _token) public initializer {
        token = _token;
        betIndex = 1;
        Coins["BNB"] = WBNB; //WBNB address
        PANCAKESWAP_ROUTER = 0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3;
        isBettingEnabled = true;
        __Ownable_init();
    }

    struct BetStruct {
        address user;
        string opcode;
        uint256 wgrAmount;
        string coin;
        uint256 coinAmount;
        string wgrBetTx;
        string payoutTxId;
        string finalStatus;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    mapping(uint256 => BetStruct) public Bets;
    event Bet(
        uint256 indexed betIndex,
        address indexed user,
        string opcode,
        uint256 wgrAmount,
        string coin,
        uint256 coinAmount,
        uint256 timestamp,
        string finalStatus
    );
    event WgrBetTxUpdated(
        uint256 indexed betIndex,
        string wgrBetTx,
        string finalStatus
    );
    event Refund(
        uint256 indexed betIndex,
        uint256 wgrAmount,
        string coin,
        uint256 coinAmount,
        uint256 timestamp,
        string finalStatus
    );
    event Payout(
        uint256 indexed betIndex,
        uint256 wgrAmount,
        string coin,
        uint256 coinAmount,
        uint256 timestamp,
        string wgrResultType,
        string wgrPayoutTx,
        string finalStatus
    );

    bool public isBettingEnabled;

    //this swap function is used to trade from one token to another
    //the inputs are self explainatory
    //token in = the token address you want to trade out of
    //token out = the token address you want as the output of this trade
    //amount in = the amount of tokens you are sending in
    //amount out Min = the minimum amount of tokens you want out of the trade
    //to = the address you want the tokens to be sent to

    function swap(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        uint256 _amountOutMin,
        address _to
    ) private {
        //next we need to allow the pancakeswap router to spend the token we just sent to this contract
        //by calling IBEP20 approve you allow the pancakeswap contract to spend the tokens in this contract
        IBEP20(_tokenIn).safeApprove(PANCAKESWAP_ROUTER, _amountIn);

        //path is an array of addresses.
        //this path array will have 3 addresses [tokenIn, WBNB, tokenOut]
        //the if statement below takes into account if token in or token out is WBNB.  then the path is only 2 addresses
        address[] memory path;
        if (_tokenIn == WBNB || _tokenOut == WBNB) {
            path = new address[](2);
            path[0] = _tokenIn;
            path[1] = _tokenOut;
        } else {
            path = new address[](3);
            path[0] = _tokenIn;
            path[1] = WBNB;
            path[2] = _tokenOut;
        }

        //then we will call swapExactTokensForTokens
        //for the deadline we will pass in block.timestamp
        //the deadline is the latest time the trade is valid for
        IPancakeRouter(PANCAKESWAP_ROUTER).swapExactTokensForTokens(
            _amountIn,
            _amountOutMin,
            path,
            _to,
            block.timestamp
        );
    }

    //this function will return the minimum amount from a swap
    //input the 3 parameters below and it will return the minimum amount out
    //this is needed for the swap function above
    function getAmountOutMin(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) public view returns (uint256) {
        //path is an array of addresses.
        //this path array will have 3 addresses [tokenIn, WBNB, tokenOut]
        //the if statement below takes into account if token in or token out is WBNB.  then the path is only 2 addresses
        address[] memory path;
        if (_tokenIn == WBNB || _tokenOut == WBNB) {
            path = new address[](2);
            path[0] = _tokenIn;
            path[1] = _tokenOut;
        } else {
            path = new address[](3);
            path[0] = _tokenIn;
            path[1] = WBNB;
            path[2] = _tokenOut;
        }

        uint256[] memory amountOutMins = IPancakeRouter(PANCAKESWAP_ROUTER)
            .getAmountsOut(_amountIn, path);
        return amountOutMins[path.length - 1];
    }

    function updatePancakeRouter(address _newRouter) external onlyOwner {
        PANCAKESWAP_ROUTER = _newRouter;
    }

    function onOff() external onlyOwner {
        isBettingEnabled = !isBettingEnabled;
    }

    function addCoin(string calldata _symbol, address _coinAddress)
        external
        onlyOwner
    {
        Coins[_symbol] = _coinAddress;
    }

    function removeCoin(string calldata _symbol) external onlyOwner {
        delete Coins[_symbol];
    }

    // Function to withdraw all Ether from this contract.
    function withdraw(uint256 _amount) external onlyOwner returns (bool) {
        // get the amount of token stored in this contract
        uint256 amount = token.balanceOf(address(this));

        require(amount >= _amount, "amount exceeds");

        // send all token to owner
        token.safeTransfer(owner(), _amount);
    }

    function validateAndUpdateState(
        uint256 _wgrAmount,
        string memory _opcode,
        address _caller,
        string memory _tokenFrom,
        uint256 _coinAmount
    ) private returns (uint256) {
        //check amount cannot be less then 100 and greator then 10000
        require(
            _wgrAmount >= 100 ether && _wgrAmount <= 10000 ether,
            "(min/max) bet (100/10000) BWGR"
        );

        //opcode required
        require(bytes(_opcode).length > 6, "invalid opcode");

        //store bet with action=pending
        Bets[betIndex] = BetStruct(
            _caller,
            _opcode,
            _wgrAmount,
            _tokenFrom,
            _coinAmount,
            "",
            "",
            "pending"
        );
        totalBets["total"] += _wgrAmount;
        totalBets[_tokenFrom] += _coinAmount;

        //totalBets = totalBets + amountOutMin;
        uint256 tempBetIndex = betIndex;
        //increase bet (index/count)
        betIndex++;

        return tempBetIndex;
    }

    function doBet2(
        string calldata _opcode,
        string calldata _tokenFrom,
        uint256 _amount
    ) external {
        require(isBettingEnabled == true, "Betting is disabled");

        address fromToken = Coins[_tokenFrom];

        require(fromToken != address(0), "Coin not supported");

        uint256 amountOutMin = getAmountOutMin(fromToken, BWGR, _amount);

        uint256 tempBetIndex = validateAndUpdateState(
            amountOutMin,
            _opcode,
            msg.sender,
            _tokenFrom,
            _amount
        );
        //first we need to transfer the amount in tokens from the msg.sender to this contract
        //this contract will have the amount of in tokens

        IBEP20(fromToken).safeTransferFrom(msg.sender, address(this), _amount);

        swap(fromToken, BWGR, _amount, amountOutMin, address(this));

        //emit bet event
        emit Bet(
            tempBetIndex,
            msg.sender,
            _opcode,
            amountOutMin,
            _tokenFrom,
            _amount,
            block.timestamp,
            Bets[tempBetIndex].finalStatus
        );
    }

    function doBet(string calldata _opcode, uint256 _amount) external {
        require(isBettingEnabled == true, "Betting is disabled");

        uint256 tempBetIndex = validateAndUpdateState(
            _amount,
            _opcode,
            msg.sender,
            "WGR",
            _amount
        );

        //transfer bet amount
        token.safeTransferFrom(msg.sender, address(this), _amount);

        //emit bet event
        emit Bet(
            tempBetIndex,
            msg.sender,
            _opcode,
            _amount,
            "WGR",
            _amount, //wgrAmount and coinAmount both same
            block.timestamp,
            Bets[tempBetIndex].finalStatus
        );
    }

    function refund(uint256 _betIndex) external onlyOwner returns (bool) {
        //require valid betIndex
        require(_betIndex < betIndex, "invalid betIndex");
        //check final status should be pending.
        require(
            keccak256(abi.encodePacked(Bets[_betIndex].finalStatus)) ==
                keccak256(abi.encodePacked("pending")),
            "bet already processed"
        );

        //get bet by index
        address user = Bets[_betIndex].user;
        uint256 amount = Bets[_betIndex].wgrAmount;
        string memory coin = Bets[_betIndex].coin;
        //update bet status
        Bets[_betIndex].finalStatus = "refunded";
        totalRefunds["total"] += amount;
        uint256 amountOutMin = 0;
        if (
            keccak256(abi.encodePacked(coin)) ==
            keccak256(abi.encodePacked("WGR"))
        ) {
            totalRefunds["WGR"] += amount;
            amountOutMin = amount;
            //refund full bet amount to user
            token.safeTransfer(user, amount);
        } else {
            address toToken = Coins[coin];
            amountOutMin = getAmountOutMin(BWGR, toToken, amount);
            totalRefunds[coin] += amountOutMin;
            swap(BWGR, toToken, amount, amountOutMin, user);
        }

        emit Refund(
            _betIndex,
            amount,
            coin,
            amountOutMin,
            block.timestamp,
            Bets[_betIndex].finalStatus
        );

        return true;
    }

    function updateWgrBetTx(uint256 _betIndex, string calldata _txId)
        external
        onlyOwner
        returns (bool)
    {
        //require valid betIndex
        require(_betIndex < betIndex, "invalid betIndex");

        //check final status should be pending.
        require(
            keccak256(abi.encodePacked(Bets[_betIndex].finalStatus)) ==
                keccak256(abi.encodePacked("pending")),
            "wgrBetTx already updated"
        );

        //require wgrBetTx
        require(bytes(_txId).length > 0, "txId cannot be empty");

        Bets[_betIndex].wgrBetTx = _txId;

        //update bet status
        Bets[_betIndex].finalStatus = "processed";

        emit WgrBetTxUpdated(_betIndex, _txId, Bets[_betIndex].finalStatus);

        return true;
    }

    function processPayout(
        uint256 _betIndex,
        uint256 _payout,
        string calldata _payoutTx,
        string calldata _resultType
    ) external onlyOwner returns (bool) {
        //require valid betIndex
        require(_betIndex < betIndex, "invalid betIndex");
        //check final status should be bet processed.
        require(
            keccak256(abi.encodePacked(Bets[_betIndex].finalStatus)) ==
                keccak256(abi.encodePacked("processed")),
            "bet not processed yet or refunded"
        );

        //require payoutTxId
        require(bytes(_payoutTx).length > 0, "payoutTxId cannot be empty");

        //require resultType
        require(bytes(_resultType).length > 0, "resultType cannot be empty");

        //required payout amount
        require(_payout > 1 ether, "payout amount required");

        //store WGR chain payouttx id
        Bets[_betIndex].payoutTxId = _payoutTx;

        totalPayout["total"] += _payout;

        //update bet status
        Bets[_betIndex].finalStatus = "completed";

        //get bet by index
        address user = Bets[_betIndex].user;
        uint256 amountOutMin = 0;

        // prevent "CompilerError: Stack too deep, try removing local variables."
        string memory coin = Bets[_betIndex].coin;
        string memory finalStatus = Bets[_betIndex].finalStatus;
        string memory payoutTx = _payoutTx;
        string memory resultType = _resultType;

        if (
            keccak256(abi.encodePacked(coin)) ==
            keccak256(abi.encodePacked("WGR"))
        ) {
            totalPayout["WGR"] += _payout;
            amountOutMin = _payout;
            //send payout
            token.safeTransfer(user, _payout);
        } else {
            address toToken = Coins[coin];
            amountOutMin = getAmountOutMin(BWGR, toToken, _payout);
            totalPayout[coin] += amountOutMin;
            swap(BWGR, toToken, _payout, amountOutMin, user);
        }

        emit Payout(
            _betIndex,
            _payout,
            coin,
            amountOutMin,
            block.timestamp,
            resultType,
            payoutTx,
            finalStatus
        );

        return true;
    }

    function version() external view returns (string memory) {
        return "v4";
    }
}
