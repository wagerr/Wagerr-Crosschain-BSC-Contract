pragma solidity ^0.8.0;
import "./interfaces/IBEP20.sol";
import "./openzeppelin/SafeBEP20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/IPancakeRouter02.sol";
import "./interfaces/IWETH.sol";

contract BettingV4 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeBEP20 for IBEP20;
    using SafeMath for uint256;

    IBEP20 private token;
    uint256 public betIndex;

    mapping(string => address) public Coins;
    mapping(string => uint256) public totalBets;
    mapping(string => uint256) public totalRefunds;
    mapping(string => uint256) public totalPayout;

    address private PANCAKESWAP_ROUTER;
    address private WBNB;
    address private BWGR;

    bool public isBettingEnabled;

    uint256 public fee; //fees gwei

    function initialize(
        address _token,
        address _wbnb,
        address _pancakeRouter
    ) public initializer {
        token = IBEP20(_token);
        betIndex = 1;
        PANCAKESWAP_ROUTER = _pancakeRouter;
        WBNB = _wbnb;
        BWGR = _token;

        isBettingEnabled = true;
        fee = 1009820 gwei;
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

    modifier bettingEnable() {
        require(isBettingEnabled == true, "Betting is disabled");
        _;
    }

    //this function will return the minimum amount from a swap
    //input the 3 parameters below and it will return the minimum amount out
    //this is needed for the swap function above
    function getAmountOutMin(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) internal view returns (uint256) {
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

        uint256[] memory amountOutMins = IPancakeRouter02(PANCAKESWAP_ROUTER)
            .getAmountsOut(_amountIn, path);
        return amountOutMins[path.length - 1];
    }

    //Returns the min output assets require to buy exact input
    function getAmountInMin(
        address _tokenOut,
        address _tokenIn,
        uint256 _amountOut
    ) external view returns (uint256) {
        //path is an array of addresses.
        //this path array will have 3 addresses [tokenIn, WBNB, tokenOut]
        //the if statement below takes into account if token in or token out is WBNB.  then the path is only 2 addresses
        address[] memory path;
        if (_tokenIn == WBNB || _tokenOut == WBNB) {
            path = new address[](2);
            path[0] = _tokenOut;
            path[1] = _tokenIn;
        } else {
            path = new address[](3);
            path[0] = _tokenOut;
            path[1] = WBNB;
            path[2] = _tokenIn;
        }

        uint256[] memory amountInMins = IPancakeRouter02(PANCAKESWAP_ROUTER)
            .getAmountsIn(_amountOut, path);
        return amountInMins[0];
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

    function setFee(uint256 _fee) external onlyOwner {
        fee = _fee; //fees in BNB
    }

    // Function to withdraw all Ether from this contract.
    function withdraw(uint256 _amount) external onlyOwner returns (bool) {
        // get the amount of token stored in this contract
        uint256 amount = token.balanceOf(address(this));

        require(amount >= _amount, "amount exceeds");

        // send all token to owner
        token.safeTransfer(owner(), _amount);
    }

    function convertFeeToCoin(address _coin) public view returns (uint256) {
        if (_coin == WBNB) return fee;
        uint256 fee = getAmountOutMin(WBNB, _coin, fee);

        return fee;
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
        totalBets[_tokenFrom] += _coinAmount.sub(
            convertFeeToCoin(Coins[_tokenFrom])
        );

        //totalBets = totalBets + amountOutMin;
        uint256 tempBetIndex = betIndex;
        //increase bet (index/count)
        betIndex++;

        return tempBetIndex;
    }

    function betWithBNB(string calldata _opcode)
        external
        payable
        bettingEnable
    {
        uint256 amountOutMin = getAmountOutMin(WBNB, BWGR, msg.value);

        amountOutMin = amountOutMin.sub(convertFeeToCoin(BWGR));

        uint256 tempBetIndex = validateAndUpdateState(
            amountOutMin,
            _opcode,
            msg.sender,
            "BNB",
            msg.value
        );
        address[] memory path = new address[](2);
        path[0] = WBNB;
        path[1] = BWGR;

        //converting full bnb amount to WGR without fee deduction.
        //but actual WGR betting amount has fees deduction(amountOutMin).  deducted wgr will be store in contract.
        IPancakeRouter02(PANCAKESWAP_ROUTER).swapExactETHForTokens{
            value: msg.value
        }(amountOutMin, path, address(this), block.timestamp); //calling payable function

        //emit bet event
        emit Bet(
            tempBetIndex,
            msg.sender,
            _opcode,
            amountOutMin,
            "BNB",
            msg.value,
            block.timestamp,
            Bets[tempBetIndex].finalStatus
        );
    }

    function betWithToken(
        string calldata _opcode,
        string calldata _tokenFrom,
        uint256 _amount
    ) external bettingEnable {
        address fromToken = Coins[_tokenFrom];

        require(fromToken != address(0), "Coin not supported");

        uint256 amountOutMin = getAmountOutMin(fromToken, BWGR, _amount);

        amountOutMin = amountOutMin.sub(convertFeeToCoin(BWGR));

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

        IBEP20(fromToken).safeApprove(PANCAKESWAP_ROUTER, _amount);

        address[] memory path = new address[](3);
        path[0] = fromToken;
        path[1] = WBNB;
        path[2] = BWGR;

        //converting full fromToken amount to WGR without fee deduction.
        //but actual WGR betting amount has fees deduction(amountOutMin).  deducted wgr will be store in contract.
        IPancakeRouter02(PANCAKESWAP_ROUTER).swapExactTokensForTokens(
            _amount,
            amountOutMin,
            path,
            address(this),
            block.timestamp
        );

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

    function betWithWGR(string calldata _opcode, uint256 _amount)
        external
        bettingEnable
    {
        uint256 amount = _amount.sub(convertFeeToCoin(BWGR));

        uint256 tempBetIndex = validateAndUpdateState(
            amount,
            _opcode,
            msg.sender,
            "WGR",
            amount
        );

        //transfer bet amount
        token.safeTransferFrom(msg.sender, address(this), _amount);

        //emit bet event
        emit Bet(
            tempBetIndex,
            msg.sender,
            _opcode,
            amount,
            "WGR",
            _amount,
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

        amount = amount.sub(convertFeeToCoin(BWGR));

        if (
            keccak256(abi.encodePacked(coin)) ==
            keccak256(abi.encodePacked("WGR"))
        ) {
            totalRefunds["WGR"] += amount;
            amountOutMin = amount;
            //refund full bet amount to user
            token.safeTransfer(user, amount);
        } else if (
            keccak256(abi.encodePacked(coin)) ==
            keccak256(abi.encodePacked("BNB"))
        ) {
            address[] memory path = new address[](2);
            path[0] = BWGR;
            path[1] = WBNB;

            amountOutMin = getAmountOutMin(BWGR, WBNB, amount);
            totalRefunds[coin] += amountOutMin;
            token.safeApprove(PANCAKESWAP_ROUTER, amount);
            IPancakeRouter02(PANCAKESWAP_ROUTER).swapExactTokensForETH(
                amount,
                amountOutMin,
                path,
                user,
                block.timestamp
            );
        } else {
            address toToken = Coins[coin];

            address[] memory path = new address[](3);
            path[0] = BWGR;
            path[1] = WBNB;
            path[2] = toToken;

            amountOutMin = getAmountOutMin(BWGR, toToken, amount);
            totalRefunds[coin] += amountOutMin;
            token.safeApprove(PANCAKESWAP_ROUTER, amount);
            IPancakeRouter02(PANCAKESWAP_ROUTER).swapExactTokensForTokens(
                amount,
                amountOutMin,
                path,
                user,
                block.timestamp
            );
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

        // prevent "CompilerError: Stack too deep, try removing local variables."
        string memory coin = Bets[_betIndex].coin;
        string memory finalStatus = Bets[_betIndex].finalStatus;
        string memory payoutTx = _payoutTx;
        string memory resultType = _resultType;
        uint256 payout = _payout;

        require(
            keccak256(abi.encodePacked(finalStatus)) ==
                keccak256(abi.encodePacked("processed")),
            "bet not processed yet or refunded"
        );

        //require payoutTxId
        require(bytes(payoutTx).length > 0, "payoutTxId cannot be empty");

        //require resultType
        require(bytes(resultType).length > 0, "resultType cannot be empty");

        //required payout amount
        require(payout > 1 ether, "payout amount required");

        //store WGR chain payouttx id
        Bets[_betIndex].payoutTxId = payoutTx;

        totalPayout["total"] += payout;

        //update bet status
        Bets[_betIndex].finalStatus = "completed";
        finalStatus = Bets[_betIndex].finalStatus;

        //get bet by index
        address user = Bets[_betIndex].user;
        uint256 amountOutMin = 0;

        payout = payout.sub(convertFeeToCoin(BWGR));

        if (
            keccak256(abi.encodePacked(coin)) ==
            keccak256(abi.encodePacked("WGR"))
        ) {
            totalPayout["WGR"] += payout;
            amountOutMin = payout;
            //send payout
            token.safeTransfer(user, payout);
        } else if (
            keccak256(abi.encodePacked(coin)) ==
            keccak256(abi.encodePacked("BNB"))
        ) {
            address[] memory path = new address[](2);
            path[0] = BWGR;
            path[1] = WBNB;
            amountOutMin = getAmountOutMin(BWGR, WBNB, payout);
            totalPayout[coin] += amountOutMin;
            token.safeApprove(PANCAKESWAP_ROUTER, payout);
            IPancakeRouter02(PANCAKESWAP_ROUTER).swapExactTokensForETH(
                payout,
                amountOutMin,
                path,
                user,
                block.timestamp
            );
        } else {
            address toToken = Coins[coin];

            address[] memory path = new address[](3);
            path[0] = BWGR;
            path[1] = WBNB;
            path[2] = toToken;

            amountOutMin = getAmountOutMin(BWGR, toToken, payout);
            totalPayout[coin] += amountOutMin;
            token.safeApprove(PANCAKESWAP_ROUTER, payout);
            IPancakeRouter02(PANCAKESWAP_ROUTER).swapExactTokensForTokens(
                payout,
                amountOutMin,
                path,
                user,
                block.timestamp
            );
        }

        emit Payout(
            _betIndex,
            payout,
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
