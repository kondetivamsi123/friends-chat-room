import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import datetime

# Point to the frontend build folder
frontend_folder = os.path.join(os.getcwd(), 'frontend_chat', 'dist')
app = Flask(__name__, static_folder=frontend_folder, static_url_path='')
# Enable CORS for local development
CORS(app)

# =======================
# STATIC FRONTEND ROUTES
# =======================

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(404)
def not_found(e):
    # This ensures React routing works if you refresh on a sub-page
    return send_from_directory(app.static_folder, 'index.html')


# =======================
# MOCK DATABASE
# =======================
users = {
    # Main User
    "vkrishna368.mail.com@gmail.com": {
        "password": "Vamsi@143", 
        "name": "Vamsi Krishna", 
        "mfa_secret": "123456", 
        "mfa_enabled": True
    },
    # Friend 1
    "Saiprakash": {
        "password": "Sai@123",
        "name": "Sai Prakash",
        "mfa_secret": "123456",
        "mfa_enabled": True
    },
    # Friend 2
    "Danarao": {
        "password": "Dana@123",
        "name": "Dana Rao",
        "mfa_secret": "123456",
        "mfa_enabled": True
    },
}

channels = {
    1: {"name": "Experience Sharing", "messages": [], "typing": {}}
}

# Session storage to track logged-in users
sessions = {}

# Presence tracking
presence = {} # {username: last_active_timestamp}
meetings = {} # {channel_id: {"meeting_url": url, "started_by": name, "start_time": iso}}

# =======================
# AUTH ROUTES
# =======================

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('login') # Frontend sends 'login'
    password = data.get('password')
    print(f"Login attempt: User='{username}' Pass='{password}'")
    
    print(f"DEBUG: Comparing '{username}' against known keys: {list(users.keys())}")
    
    # Check if user exists
    user = users.get(username)
    
    if not user:
         print(f"DEBUG: User '{username}' NOT FOUND in users dict.")
         return jsonify({
            'jsonrpc': '2.0',
            'id': None,
            'error': {
                'message': 'Odoo Server Error',
                'code': 200,
                'data': {
                    'message': 'This email does not exist in our system. Please ask Vamsi for permission.',
                    'exception_type': 'access_denied',
                }
            }
        }), 200

    if user['password'] != password:
        return jsonify({
            'jsonrpc': '2.0',
            'id': None,
            'error': {
                'message': 'Odoo Server Error',
                'code': 200,
                'data': {
                    'message': 'Wrong Password',
                    'exception_type': 'access_denied',
                }
            }
        }), 200

    # Logic similar to Odoo custom module
    if user.get('mfa_enabled'):
        # Store partial session
        session_id = str(hash(username + str(datetime.datetime.now())))
        sessions[session_id] = {'username': username, 'name': user['name'], 'mfa_verified': False}
        
        return jsonify({
            'result': {
                'status': 'mfa_required',
                'uid': username, # Using username as ID for simplicity
                'name': user['name'],
                'session_id': session_id
            }
        })
    else:
        session_id = str(hash(username + str(datetime.datetime.now())))
        sessions[session_id] = {'username': username, 'name': user['name'], 'mfa_verified': True}
        
        return jsonify({
            'result': {
                'status': 'success',
                'uid': username,
                'name': user['name'],
                'session_id': session_id
            }
        })

@app.route('/api/auth/mfa_verify', methods=['POST'])
def mfa_verify():
    data = request.json
    code = data.get('code')
    
    # In a real app we'd need to know info from the session.
    # For this mock, we validate against the hardcoded secret "123456" 
    # which we set for our user. 
    
    valid = False
    if code == "123456": 
        valid = True
        
    if valid:
        return jsonify({'result': {'status': 'success'}})
    else:
        return jsonify({'error': 'Invalid MFA Code'})

# =======================
# CHAT ROUTES
# =======================

@app.route('/api/chat/join', methods=['POST'])
def chat_join():
    data = request.json
    # Always join channel 1
    return jsonify({
        'result': {
            'channel_id': 1,
            'name': channels[1]['name']
        }
    })

@app.route('/api/chat/messages', methods=['POST'])
def chat_messages():
    data = request.json
    channel_id = int(data.get('channel_id'))
    
    msgs = channels.get(channel_id, {}).get('messages', [])
    typing_users = channels.get(channel_id, {}).get('typing', {})
    
    # Get list of who's typing (exclude expired)
    import time
    current_time = time.time()
    active_typing = [name for name, timestamp in typing_users.items() if current_time - timestamp < 5]
    
    # Return last 50 messages
    return jsonify({
        'result': {
            'messages': sorted(msgs[-50:], key=lambda x: x['id'], reverse=True),
            'typing': active_typing
        }
    })

@app.route('/api/chat/presence', methods=['POST'])
def chat_presence():
    """Update presence status and return online users + meeting info"""
    data = request.json
    session_id = data.get('session_id')
    channel_id = int(data.get('channel_id', 1))
    
    if not session_id or session_id not in sessions:
        return jsonify({'error': 'Invalid session'}), 401
    
    user_name = sessions[session_id]['name']
    import time
    current_time = time.time()
    presence[user_name] = current_time
    
    online_users = [name for name, timestamp in presence.items() if current_time - timestamp < 15]
    
    meeting_info = meetings.get(channel_id)
    
    return jsonify({
        'result': {
            'status': 'success',
            'online': online_users,
            'meeting': meeting_info
        }
    })

@app.route('/api/chat/meeting/start', methods=['POST'])
def start_meeting_route():
    data = request.json
    channel_id = int(data.get('channel_id', 1))
    url = data.get('url')
    session_id = data.get('session_id')
    
    if not session_id or session_id not in sessions:
        return jsonify({'error': 'Invalid session'}), 401
        
    user_name = sessions[session_id]['name']
    
    meetings[channel_id] = {
        'meeting_url': url,
        'started_by': user_name,
        'start_time': datetime.datetime.now().isoformat()
    }
    
    return jsonify({'result': {'status': 'success'}})

@app.route('/api/chat/typing', methods=['POST'])
def chat_typing():
    """Update typing status for a user"""
    data = request.json
    channel_id = int(data.get('channel_id', 1))
    session_id = data.get('session_id')
    is_typing = data.get('is_typing', False)
    
    if not session_id or session_id not in sessions:
        return jsonify({'error': 'Invalid session'}), 401
    
    user_name = sessions[session_id]['name']
    
    import time
    if is_typing:
        channels[channel_id]['typing'][user_name] = time.time()
    else:
        channels[channel_id]['typing'].pop(user_name, None)
    
    return jsonify({'result': {'status': 'success'}})

@app.route('/api/chat/post', methods=['POST'])
def chat_post():
    data = request.json
    channel_id = int(data.get('channel_id'))
    body = data.get('body') 
    session_id = data.get('session_id')
    
    # Get author from session
    if not session_id or session_id not in sessions:
        author_name = "Anonymous"
    else:
        author_name = sessions[session_id]['name']
    
    msg_id = len(channels[channel_id]['messages']) + 1
    new_msg = {
        'id': msg_id,
        'author': author_name,
        'body': body,
        'date': datetime.datetime.now().isoformat()
    }
    
    channels[channel_id]['messages'].append(new_msg)
    
    # Clear typing indicator for this user
    channels[channel_id]['typing'].pop(author_name, None)
    
    return jsonify({
        'result': {
            'status': 'success',
            'message_id': msg_id
        }
    })

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 8069))
    print(f"Starting Friends Chat Room Backend on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
