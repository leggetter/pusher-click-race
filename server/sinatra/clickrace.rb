require 'sinatra'
require 'pusher'
require 'json'
require 'uuid'
require 'yaml'

config = YAML.load_file("config.yml")

Pusher.app_id = config["config"]["app_id"]
Pusher.key = config["config"]["key"]
Pusher.secret = config["config"]["secret"]

set :public, '../../client/'

get '/' do
  redirect '/index.html'
end

post '/pusher/auth' do
  
  auth = nil
  
  if params[:runner] == nil
    # race channel
    auth = get_audience_auth(params[:socket_id], params[:channel_name])
  else
    # click channel
    auth = get_runner_auth(params[:socket_id], params[:channel_name], params[:runner])
  end
  

  content_type 'application/json'
  return JSON.generate(auth)
end

def get_audience_auth(socket_id, channel_name)

  uuid = UUID.new
  channel_data = {
          :user_id => uuid.generate,
          :user_info => { :test => 'test' }
        }
  
  return Pusher[channel_name].authenticate(socket_id, channel_data)
end

def get_runner_auth(socket_id, channel_name, runner_name)

  channel_data = {
          :user_id => runner_name,
          :user_info => { :name => runner_name }
        }
  
  return Pusher[channel_name].authenticate(socket_id, channel_data)
end