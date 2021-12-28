// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Seeder {
    using SafeMath for uint256;

    mapping(address => uint256) public feePerSeed;

    event FeePerSeedChanged(address token, uint256 feePerSeed);

    function getSeedAmount(address token, uint256 amount)
        public
        view
        returns (uint256)
    {
        uint256 price = feePerSeed[token];

        if (price > 0) {
            return amount.mul(10**18).div(price);
        }

        return 0;
    }

    function setFeePerSeed(address token, uint256 price) public {
        emit FeePerSeedChanged(token, price);
        feePerSeed[token] = price;
    }
}
