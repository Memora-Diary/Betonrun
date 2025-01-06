/**
 *Submitted for verification at sepolia.basescan.org on 2024-12-04
*/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MemoraCompetition {
    // Structure to hold competition details
    struct Competition {
        address creator; // Address of the competition creator
        string goal; // Description of the competition goal
        uint256 deadline; // Timestamp when the competition ends
        uint256 prizePool; // Total funds deposited for the competition
        mapping(address => bool) participants; // Mapping to track participants
        mapping(address => bool) completed; // Mapping to track completion status of participants
        bool ended; // Flag to indicate if the competition has ended
    }

    mapping(uint256 => Competition) public competitions; // Mapping of competition ID to Competition
    uint256 public competitionCount; // Counter for competition IDs
    address public admin; // Address of the admin

    // Event to log admin changes
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    // Constructor to set the initial admin
    constructor() {
        admin = msg.sender; // Set the contract deployer as the admin
    }

    // Modifier to restrict access to admin-only functions
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    // Function to create a new competition
    function createCompetition(string calldata _goal, uint256 _duration) external payable {
        require(msg.value > 0, "Must deposit funds"); // Ensure funds are deposited

        competitionCount++; // Increment competition count
        Competition storage comp = competitions[competitionCount]; // Create a new competition
        comp.creator = msg.sender; // Set the creator
        comp.goal = _goal; // Set the goal
        comp.deadline = block.timestamp + _duration; // Set the deadline
        comp.prizePool = msg.value; // Set the prize pool
        comp.participants[msg.sender] = true; // Add creator as a participant
        comp.ended = false; // Initialize the competition as not ended
    }

    // Function to join an existing competition
    function joinCompetition(uint256 _compId) external payable {
        Competition storage comp = competitions[_compId]; // Fetch the competition
        require(block.timestamp < comp.deadline, "Competition ended"); // Check if competition is still open
        require(msg.value > 0, "Must deposit funds"); // Ensure funds are deposited
        require(!comp.participants[msg.sender], "Already joined"); // Check if user is not already a participant

        comp.participants[msg.sender] = true; // Add user as a participant
        comp.prizePool += msg.value; // Increase the prize pool
    }

    // Function to validate results and distribute prizes
    function validateResults(uint256 _compId, address[] calldata _winners) external onlyAdmin {
        Competition storage comp = competitions[_compId]; // Fetch the competition
        require(!comp.ended, "Competition already ended"); // Ensure competition has not already ended

        uint256 prize = comp.prizePool / _winners.length; // Calculate prize per winner
        for (uint256 i = 0; i < _winners.length; i++) {
            require(comp.participants[_winners[i]], "Not a participant"); // Ensure winner is a participant
            comp.completed[_winners[i]] = true; // Mark as completed
            payable(_winners[i]).transfer(prize); // Transfer prize to winner
        }

        comp.ended = true; // Mark the competition as ended
    }

    // Function to change the admin
    function changeAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "New admin address cannot be zero"); // Ensure new admin address is valid
        emit AdminChanged(admin, _newAdmin); // Emit admin change event
        admin = _newAdmin; // Update admin address
    }
}