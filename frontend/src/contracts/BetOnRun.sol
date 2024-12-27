// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BetOnRun {
    // Structure to hold challenge details
    struct Challenge {
        address creator;
        string title;
        uint256 stakeAmount;
        uint256 startDate;
        uint256 endDate;
        string scheduleType; // "daily" or "weekly"
        string[] scheduleDays; // For weekly challenges
        uint256 targetDistance;
        bool ended;
        mapping(address => bool) participants;
        mapping(address => uint256) completedDays;
        mapping(address => bool) stravaConnected;
    }

    mapping(uint256 => Challenge) public challenges;
    uint256 public challengeCount;
    address public admin;

    event ChallengeCreated(
        uint256 indexed challengeId,
        address indexed creator,
        string title,
        uint256 stakeAmount
    );

    event ChallengeJoined(
        uint256 indexed challengeId,
        address indexed participant
    );

    event RunVerified(
        uint256 indexed challengeId,
        address indexed participant,
        uint256 completedDays
    );

    event RewardsDistributed(
        uint256 indexed challengeId,
        address[] winners,
        uint256 reward
    );

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    function createChallenge(
        string memory _title,
        uint256 _duration,
        string memory _scheduleType,
        string[] memory _scheduleDays,
        uint256 _targetDistance
    ) external payable {
        require(msg.value > 0, "Must stake ETH to create challenge");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_duration > 0, "Duration must be greater than 0");

        challengeCount++;
        Challenge storage challenge = challenges[challengeCount];
        
        challenge.creator = msg.sender;
        challenge.title = _title;
        challenge.stakeAmount = msg.value;
        challenge.startDate = block.timestamp;
        challenge.endDate = block.timestamp + (_duration * 1 days);
        challenge.scheduleType = _scheduleType;
        challenge.scheduleDays = _scheduleDays;
        challenge.targetDistance = _targetDistance;
        challenge.ended = false;
        challenge.participants[msg.sender] = true;
        challenge.completedDays[msg.sender] = 0;

        emit ChallengeCreated(challengeCount, msg.sender, _title, msg.value);
    }

    function joinChallenge(uint256 _challengeId) external payable {
        Challenge storage challenge = challenges[_challengeId];
        require(block.timestamp < challenge.endDate, "Challenge has ended");
        require(msg.value == challenge.stakeAmount, "Must stake exact amount");
        require(!challenge.participants[msg.sender], "Already joined");

        challenge.participants[msg.sender] = true;
        challenge.completedDays[msg.sender] = 0;

        emit ChallengeJoined(_challengeId, msg.sender);
    }

    function verifyRun(uint256 _challengeId, address _participant) external onlyAdmin {
        Challenge storage challenge = challenges[_challengeId];
        require(challenge.participants[_participant], "Not a participant");
        require(!challenge.ended, "Challenge has ended");
        require(block.timestamp <= challenge.endDate, "Challenge period over");

        challenge.completedDays[_participant]++;
        
        emit RunVerified(_challengeId, _participant, challenge.completedDays[_participant]);
    }

    function distributeRewards(uint256 _challengeId, address[] calldata _winners) external onlyAdmin {
        Challenge storage challenge = challenges[_challengeId];
        require(!challenge.ended, "Challenge already ended");
        require(block.timestamp > challenge.endDate, "Challenge still in progress");

        uint256 totalPrizePool = challenge.stakeAmount * _winners.length;
        uint256 reward = totalPrizePool / _winners.length;

        for (uint256 i = 0; i < _winners.length; i++) {
            require(challenge.participants[_winners[i]], "Invalid winner");
            payable(_winners[i]).transfer(reward);
        }

        challenge.ended = true;
        emit RewardsDistributed(_challengeId, _winners, reward);
    }

    function setStravaConnected(uint256 _challengeId, address _participant) external onlyAdmin {
        Challenge storage challenge = challenges[_challengeId];
        require(challenge.participants[_participant], "Not a participant");
        challenge.stravaConnected[_participant] = true;
    }

    function getChallengeDetails(uint256 _challengeId) external view returns (
        address creator,
        string memory title,
        uint256 stakeAmount,
        uint256 startDate,
        uint256 endDate,
        string memory scheduleType,
        string[] memory scheduleDays,
        uint256 targetDistance,
        bool ended
    ) {
        Challenge storage challenge = challenges[_challengeId];
        return (
            challenge.creator,
            challenge.title,
            challenge.stakeAmount,
            challenge.startDate,
            challenge.endDate,
            challenge.scheduleType,
            challenge.scheduleDays,
            challenge.targetDistance,
            challenge.ended
        );
    }

    function isParticipant(uint256 _challengeId, address _participant) external view returns (bool) {
        return challenges[_challengeId].participants[_participant];
    }

    function getCompletedDays(uint256 _challengeId, address _participant) external view returns (uint256) {
        return challenges[_challengeId].completedDays[_participant];
    }

    function isStravaConnected(uint256 _challengeId, address _participant) external view returns (bool) {
        return challenges[_challengeId].stravaConnected[_participant];
    }
} 