// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../Keeper.sol";

contract KeeperMock is Keeper {
    constructor(
        address _seeder,
        address _priceAggregator,
        uint8 _priceDecimals,
        address _tokenAddress, // 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
        uint8 _tokenDecimals,
        uint16 _threshold,
        uint16 _interval
    )
        Keeper(
            _seeder,
            _priceAggregator,
            _priceDecimals,
            _tokenAddress, // 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
            _tokenDecimals,
            _threshold,
            _interval
        )
    {} // solhint-disable-line no-empty-blocks

    function updateLastPrice(uint256 _lastPrice) external {
        lastPrice = _lastPrice;
    }

    function updateLastTimeStamp(uint256 _lastTimeStamp) external {
        lastTimeStamp = _lastTimeStamp;
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

    function updateTokenDecimals(uint8 _tokenDecimals) external {
        tokenDecimals = _tokenDecimals;
    }

    function updatePriceDecimals(uint8 _priceDecimals) external {
        priceDecimals = _priceDecimals;
    }
}
