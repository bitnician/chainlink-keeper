// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./KeeperBase.sol";
import "./KeeperCompatibleInterface.sol";

abstract contract KeeperCompatible is KeeperBase, KeeperCompatibleInterface {}
