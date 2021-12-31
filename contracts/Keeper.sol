// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./chainlink/KeeperCompatible.sol";
import "./PriceAggregator.sol";
import "./Seeder.sol";

// solhint-disable not-rely-on-time
contract Keeper is
    KeeperCompatibleInterface,
    KeeperBase,
    AccessControlEnumerable
{
    using SafeMath for uint256;

    PriceAggregator public priceAggregator;
    Seeder public seeder;

    uint16 public immutable divisor = 10000;
    uint16 public threshold; // set it 0 to disable the threshold
    uint16 public interval;
    uint16 public seedPerUsd = 7000; // 0.7 Seed per usd

    address public tokenAddress;
    uint8 public tokenDecimals;

    uint256 public lastPrice;
    uint256 public lastTimeStamp;

    constructor(
        address _priceAggregator,
        address _tokenAddress, // 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
        uint8 _tokenDecimals, // 8
        address _seeder,
        uint16 _threshold,
        uint16 _interval
    ) {
        require(_priceAggregator != address(0), "invalid aggregator address");
        require(_tokenAddress != address(0), "invalid token address");
        require(_tokenDecimals > 0, "invalid token decimals");
        require(_seeder != address(0), "invalid seeder address");
        require(_threshold < divisor, "invalid threshold");
        require(_interval > 0, "invalid interval");

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        priceAggregator = PriceAggregator(_priceAggregator);
        seeder = Seeder(_seeder);
        threshold = _threshold;
        tokenAddress = _tokenAddress;
        tokenDecimals = _tokenDecimals;
        interval = _interval;
    }

    function setThreshold(uint16 _threshold)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_threshold < divisor, "invalid threshold");
        threshold = _threshold; // set 0 to disable the threshold
    }

    function setInterval(uint16 _interval) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_interval > 0, "invalid interval");
        interval = _interval;
    }

    function setSeedPerUsd(uint16 _seedPerUsd)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_seedPerUsd > 0, "invalid seed per usd");
        seedPerUsd = _seedPerUsd;
    }

    function isThresholdExceeded(uint256 newPrice) public view returns (bool) {
        uint256 thresholdValue = lastPrice.mul(threshold).div(divisor);
        return
            newPrice > lastPrice.add(thresholdValue) ||
            newPrice < lastPrice.sub(thresholdValue);
    }

    function getLatestPrice() public view returns (uint256) {
        int256 newPrice = priceAggregator.getLatestPrice();
        assert(newPrice > 0);
        return uint256(newPrice);
    }

    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        virtual
        override
        cannotExecute
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256 newPrice = getLatestPrice();

        upkeepNeeded =
            (block.timestamp - lastTimeStamp) > interval &&
            isThresholdExceeded(newPrice);

        performData = abi.encode(newPrice);
    }

    function performUpkeep(bytes calldata performData) external override {
        uint256 newPrice = abi.decode(performData, (uint256));

        lastTimeStamp = block.timestamp;

        lastPrice = newPrice;
        uint256 seedPerToken = newPrice.mul(seedPerUsd).div(divisor);
        uint256 seedPrice = uint256(10**(tokenDecimals * 2)).div(seedPerToken);

        seeder.setFeePerSeed(tokenAddress, seedPrice);
    }
}
// solhint-enable not-rely-on-time
