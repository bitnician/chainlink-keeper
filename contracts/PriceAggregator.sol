// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./chainlink/AggregatorV3Interface.sol";

contract PriceAggregator {
    AggregatorV3Interface internal aggregatorV3;

    constructor(address _aggregatorV3) {
        aggregatorV3 = AggregatorV3Interface(_aggregatorV3);
    }

    /**
     * Returns the latest price
     */
    // solhint-disable no-unused-vars
    function getLatestPrice() public view returns (int256) {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = aggregatorV3.latestRoundData();
        return price;
    }
    // solhint-enable no-unused-vars
}
