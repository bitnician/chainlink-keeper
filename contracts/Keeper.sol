// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./chainlink/KeeperCompatible.sol";
import "./PriceAggregator.sol";
import "./Seeder.sol";
import "hardhat/console.sol";

// solhint-disable not-rely-on-time
contract Keeper is KeeperCompatibleInterface, KeeperBase, Ownable {
    using SafeMath for uint256;

    PriceAggregator public priceAggregator;
    Seeder public seeder;

    uint256 private immutable divisor = 10000;
    uint256 public threshold = 100; // 0.01%
    uint256 public interval = 300; // 5 mins

    address private constant NATIVE_TOKEN =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    uint256 public lastPrice;
    uint256 public lastTimeStamp;

    constructor(
        address _priceAggregator,
        address _seeder,
        uint256 _threshold
    ) {
        require(_priceAggregator != address(0), "invalid aggregator address");
        require(_seeder != address(0), "invalid seeder address");
        require(_threshold > 0, "invalid threshold");

        priceAggregator = PriceAggregator(_priceAggregator);
        seeder = Seeder(_seeder);
        threshold = _threshold;

        int256 currentPrice = priceAggregator.getLatestPrice();
        if (currentPrice > 0) {
            lastPrice = uint256(currentPrice);
        }
    }

    function setThreshold(uint256 _threshold) public onlyOwner {
        require(_threshold > 0, "invalid threshold");
        threshold = _threshold;
    }

    function setInterval(uint256 _interval) public onlyOwner {
        require(_interval > 0, "invalid interval");
        interval = _interval;
    }

    function isThresholdExceeded(uint256 newPrice) public view returns (bool) {
        uint256 diff = newPrice.mul(threshold).div(divisor);
        return newPrice > lastPrice.add(diff) || newPrice < lastPrice.sub(diff);
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
        override
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
        uint256 seedPrice = uint256(1e16).div(newPrice);
        seeder.setFeePerSeed(NATIVE_TOKEN, seedPrice);
    }
}
// solhint-enable not-rely-on-time
