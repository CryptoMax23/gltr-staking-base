// pragma solidity 0.8.13;

// import "./TestSetup.t.sol";
// import "@contracts/uniswapv2/libraries/UniswapV2Library.sol";

// contract GaxTest is TestSetup {
//   function testPairCreation() public {
//     assertEq(
//       UniswapV2Library.pairFor(
//         address(factory),
//         address(token1),
//         address(token2)
//       ),
//       0x724352bCC31daD23e7D46eB7CCA79290653AD964
//     );
//   }

//   function testSeedLiquidity() public {
//     uint256 amount1 = 1e18;
//     uint256 amount2 = 1e18;
//     token1.mint(address(this), amount1);
//     token2.mint(address(this), amount2);

//     token1.approve(address(router), amount1);
//     token2.approve(address(router), amount2);

//     router.addLiquidity(
//       address(token1),
//       address(token2),
//       amount1,
//       amount2,
//       1e10,
//       1e10,
//       address(this),
//       block.timestamp + 100
//     );
//   }
// }
