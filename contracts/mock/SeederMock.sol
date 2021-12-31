// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title Seeder
 * @notice The Seeder contract is used to issue SEEDs (an ERC20 token) in exchange for fees.
 */
contract SeederMock is AccessControlEnumerable {
    using SafeMath for uint256;

    mapping(address => uint256) public feePerSeed;

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

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

    function tokenFeeSetterRole(address token) public pure returns (bytes32) {
        return bytes32(abi.encodePacked("FEE_SETTER", token));
    }

    function setTokenFeeSetterRole(address token, address feeSetter)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(token != address(0), "token address cannot be 0");
        require(feeSetter != address(0), "fee setter address cannot be 0");

        _setupRole(tokenFeeSetterRole(token), feeSetter);
    }

    function setFeePerSeed(address token, uint256 price) public {
        require(
            hasRole(tokenFeeSetterRole(token), _msgSender()),
            "Needs role for setting fee"
        );

        feePerSeed[token] = price;
    }
}
