pragma solidity 0.8.13;

import "forge-std/Test.sol";

import "@contracts/diamond/facets/DiamondCutFacet.sol";
import "@contracts/diamond/facets/DiamondLoupeFacet.sol";
import "@contracts/diamond/facets/OwnershipFacet.sol";

import "@contracts/diamond/interfaces/IDiamondCut.sol";
import "@contracts/diamond/interfaces/IDiamondLoupe.sol";

import "@contracts/diamond/Diamond.sol";

import "@contracts/deploy/FarmAndGLTRDeployer.sol";
import "@contracts/facets/FarmFacet.sol";
import "@contracts/init/FarmInit.sol";
import "@contracts/init/ReentrancyGuardInit.sol";

import "@contracts/test/Token.sol";

import "./helpers/FarmUser.sol";

contract TestSetupFarm is Test {
  Diamond diamond;
  DiamondCutFacet diamondCutFacet;
  DiamondLoupeFacet diamondLoupeFacet;
  OwnershipFacet ownershipFacet;
  FarmFacet farmFacet;

  FarmFacet farm;

  FarmInit farmInit;
  ReentrancyGuardInit reentrancyGuardInit;

  FarmAndGLTRDeployer farmAndGLTRDeployer;

  Token[] lpTokens;
  Token rewardToken;

  FarmUser user1;
  FarmUser user2;

  uint256 startBlock;

  function setUp() public {
    startBlock = block.number + 100;
    deployAll();
    populateUsers();
  }

  function deployAll() internal {
    diamondCutFacet = new DiamondCutFacet();
    diamondLoupeFacet = new DiamondLoupeFacet();
    ownershipFacet = new OwnershipFacet();
    farmFacet = new FarmFacet();
    farmInit = new FarmInit();
    reentrancyGuardInit = new ReentrancyGuardInit();

    farmAndGLTRDeployer = new FarmAndGLTRDeployer();
    address diamond_;
    address rewardToken_;
    (diamond_, rewardToken_) = farmAndGLTRDeployer.deployFarmAndGLTR(
      FarmAndGLTRDeployer.DeployedAddresses({
        diamondCutFacet: address(diamondCutFacet),
        diamondLoupeFacet: address(diamondLoupeFacet),
        ownershipFacet: address(ownershipFacet),
        farmFacet: address(farmFacet),
        farmInit: address(farmInit),
        reentrancyGuardInit: address(reentrancyGuardInit)
      }),
      FarmAndGLTRDeployer.FarmInitParams({
        startBlock: startBlock,
        decayPeriod: 38000 * 365
      })
    );
    diamond = Diamond(payable(diamond_));
    rewardToken = Token(rewardToken_);
    farm = FarmFacet(diamond_);
    deployTokens(20);
  }

  function deployTokens(uint256 _numTokens) internal {
    for (uint256 i = 0; i < _numTokens; i++) {
      lpTokens.push(new Token());
    }
  }

  function populateUsers() internal {
    user1 = new FarmUser();
    user2 = new FarmUser();
  }
}
