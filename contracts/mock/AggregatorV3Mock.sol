// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract AggregatorV3Mock {
    int256 public tokenPrice;

    constructor(int256 _price) {
        tokenPrice = _price;
    }

    function updatePrice(int256 _price) public {
        tokenPrice = _price;
    }

    function latestRoundData()
        public
        view
        returns (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        )
    {
        roundID = 1;
        price = tokenPrice;
        startedAt = block.timestamp - 1000;
        timeStamp = block.timestamp;
        answeredInRound = 1;
    }
}
