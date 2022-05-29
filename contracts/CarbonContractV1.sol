//SPDX-License-Identifier: MIT

// |\   ____\|\   ____\|\   ___  \        |\  \    /  /|/ __  \    
// \ \  \___|\ \  \___|\ \  \\ \  \       \ \  \  /  / /\/_|\  \   
//  \ \  \    \ \  \    \ \  \\ \  \       \ \  \/  / /\|/ \ \  \  
//   \ \  \____\ \  \____\ \  \\ \  \       \ \    / /      \ \  \ 
//    \ \_______\ \_______\ \__\\ \__\       \ \__/ /        \ \__\
//     \|_______|\|_______|\|__| \|__|        \|__|/          \|__|

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

contract CarbonCollectibleNFTsV1 is Initializable, ERC721Upgradeable, OwnableUpgradeable {
  using StringsUpgradeable for uint256;
  using CountersUpgradeable for CountersUpgradeable.Counter; 

  CountersUpgradeable.Counter private supply;

  string uriPrefix;
  string public uriSuffix;
  
  uint256 public cost;
  uint256 public maxSupply;

  bool public paused;
  bool public preSale;

  mapping(address => bool) public teamMembers;
  mapping(address => bool) public whitelisted;

  function initialize(string memory _initBaseURI, address _initOwner) public initializer {
    __ERC721_init("CarbonCollectibleNFTs", "CCN");
    __Ownable_init();

    setUriSuffix(".json");
    setUriPrefix(_initBaseURI);
    setCost(1000000000000000000);
    setMaxSupply(3000);
    setPaused(false);
    setPreSale(true);
    transferOwnership(_initOwner);
    _mintLoop(_initOwner, 1);
  }

  modifier mintCompliance(uint256 _mintAmount) {
    require(_mintAmount > 0, "Invalid mint amount!");
    require(supply.current() + _mintAmount <= maxSupply, "Max supply exceeded!");
    _;
  }

  modifier onlyTeam {
    require(msg.sender == owner() || teamMembers[msg.sender] == true, "Ownable: You are not in the team, Bye.");
    _;
  }

  function _baseURI() internal view virtual override returns (string memory) {
    return uriPrefix;
  }

  function getTotalSupply() public view returns (uint256) {
    return supply.current();
  }

  function getMaxSupply() public view returns (uint256) {
    return maxSupply;
  }

  function getCost() public view returns (uint256) {
    return cost;
  }

  function mint(uint256 _mintAmount) public payable mintCompliance(_mintAmount) {
    require(!paused, "The contract is paused!");
    require(msg.value >= cost * _mintAmount, "Insufficient funds!");

    if (preSale) {
      require(whitelisted[msg.sender] == true, "You are not in PRE-SALE list!");
    }

    _mintLoop(msg.sender, _mintAmount);
  }
  
  function mintForAddress(uint256 _mintAmount, address _receiver) public mintCompliance(_mintAmount) onlyTeam {
    _mintLoop(_receiver, _mintAmount);
  }

  function walletOfOwner(address _owner)
    public
    view
    returns (uint256[] memory)
  {
    uint256 ownerTokenCount = balanceOf(_owner);
    uint256[] memory ownedTokenIds = new uint256[](ownerTokenCount);
    uint256 currentTokenId = 1;
    uint256 ownedTokenIndex = 0;

    while (ownedTokenIndex < ownerTokenCount && currentTokenId <= maxSupply) {
      address currentTokenOwner = ownerOf(currentTokenId);

      if (currentTokenOwner == _owner) {
        ownedTokenIds[ownedTokenIndex] = currentTokenId;
        ownedTokenIndex++;
      }
      currentTokenId++;
    }
    return ownedTokenIds;
  }

  function tokenURI(uint256 _tokenId)
    public
    view
    virtual
    override
    returns (string memory)
  {
    require(
      _exists(_tokenId),
      "ERC721Metadata: URI query for nonexistent token"
    );

    string memory currentBaseURI = _baseURI();
    return bytes(currentBaseURI).length > 0
        ? string(abi.encodePacked(currentBaseURI, _tokenId.toString(), uriSuffix))
        : "";
  }

  function setCost(uint256 _cost) public onlyOwner {
    cost = _cost;
  }

  function setUriPrefix(string memory _uriPrefix) public onlyOwner {
    uriPrefix = _uriPrefix;
  }

  function setUriSuffix(string memory _uriSuffix) public onlyOwner {
    uriSuffix = _uriSuffix;
  }

  function setPaused(bool _state) public onlyOwner {
    paused = _state;
  }

  function setMaxSupply(uint256 _amount) public onlyOwner {
    maxSupply = _amount;
  }

  function setPreSale(bool _state) public onlyOwner {
    preSale = _state;
  }

  function addWhitelist (address[] memory _users) public onlyTeam {
    for (uint i = 0; i < _users.length; i++) {
      whitelisted[_users[i]] = true;
    }
  }

  function removeWhitelist (address[] memory _users) public onlyTeam {
    for (uint i = 0; i < _users.length; i++) {
      whitelisted[_users[i]] = false;
    }
  }

  function addTeamMember (address _member) public onlyOwner {
    teamMembers[_member] = true;
  }

  function removeTeamMember (address _member) public onlyOwner {
    teamMembers[_member] = false;
  }

  function withdraw() public onlyOwner {
    (bool os, ) = payable(owner()).call{value: address(this).balance}("");
    require(os);
  }

  function _mintLoop(address _receiver, uint256 _mintAmount) internal {
    for (uint256 i = 0; i < _mintAmount; i++) {
      supply.increment();
      _safeMint(_receiver, supply.current());
    }
  }
}