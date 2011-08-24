<?php
require_once('../squeeks-Pusher-PHP/lib/Pusher.php');
require_once('../config.php');

$pusher = new Pusher\Pusher($key, $secret, $app_id);

$channel_name = $_POST['channel_name'];
$socket_id = $_POST['socket_id'];
$runner_name = $_POST['runner'];
$pusher->presence_auth('my-channel','socket_id', 'user_id', 'user_info');
  
$auth = null;

if (!$runner_name) {
  // race channel
  $auth = get_audience_auth($pusher, $socket_id, $channel_name);
}
else {
  // click channel
  $auth = get_runner_auth($pusher, $socket_id, $channel_name, $runner_name);
}

header('Content-type: application/json');
echo $auth;

function get_audience_auth($pusher, $socket_id, $channel_name) {

  $uuid = uniqid();
  $presence_data = array('name' => $uuid);
  return $pusher->presence_auth($channel_name, $socket_id, $uuid, $presence_data);
}

function get_runner_auth($pusher, $socket_id, $channel_name, $runner_name) {

  $presence_data = array('name' => $runner_name);
  return $pusher->presence_auth($channel_name, $socket_id, $runner_name, $presence_data);
}