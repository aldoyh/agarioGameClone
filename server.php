<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

session_start();

$game_state = [
    'players' => [],
    'food' => []
];

// Load game state from file
if (file_exists('game_state.json')) {
    $game_state = json_decode(file_get_contents('game_state.json'), true);
}

// Ensure food array exists and generate food if needed
if (!isset($game_state['food']) || !is_array($game_state['food'])) {
    $game_state['food'] = [];
}

while (count($game_state['food']) < 100) {
    $game_state['food'][] = [
        'x' => rand(0, 1000),
        'y' => rand(0, 1000)
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if ($input['type'] === 'join') {
        $player_id = uniqid();
        $_SESSION['player_id'] = $player_id;
        $game_state['players'][$player_id] = [
            'x' => rand(0, 1000),
            'y' => rand(0, 1000),
            'radius' => 10,
            'color' => sprintf('#%06X', mt_rand(0, 0xFFFFFF))
        ];
        echo json_encode(['type' => 'init', 'id' => $player_id, 'game_state' => $game_state]);
    } elseif ($input['type'] === 'update') {
        $player_id = $input['id'];
        if (isset($game_state['players'][$player_id])) {
            $game_state['players'][$player_id]['x'] = $input['x'];
            $game_state['players'][$player_id]['y'] = $input['y'];
            $game_state['players'][$player_id]['radius'] = $input['radius'];
        }
        echo json_encode(['type' => 'update', 'game_state' => $game_state]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(['type' => 'update', 'game_state' => $game_state]);
}

// Save game state to file
file_put_contents('game_state.json', json_encode($game_state));

// Clean up inactive players (you may want to adjust the timeout)
foreach ($game_state['players'] as $id => $player) {
    if (!isset($_SESSION[$id]) || (time() - $_SESSION[$id]) > 30) {
        unset($game_state['players'][$id]);
    }
}
?>