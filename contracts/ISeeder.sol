// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface ISeeder {
    function feePerSeed(address feeToken) external view returns (uint256);

    function getSeedAmount(address token, uint256 amount)
        external
        view
        returns (uint256);

    function tokenIssuable(address token) external view returns (bool);

    function issueSeedsForErc20(
        address recipient,
        address feeToken,
        uint256 feeAmount
    ) external;

    function issueSeedsForErc20Multiple(
        address[] calldata recipients,
        address feeToken,
        uint256[] calldata feeAmounts
    ) external;

    function issueSeedsForNative(address recipient) external payable;

    function issueSeedsForNativeMultiple(
        address[] calldata recipients,
        uint256[] calldata feeAmounts
    ) external payable;

    function setFeePerSeed(address token, uint256 price) external;
}
