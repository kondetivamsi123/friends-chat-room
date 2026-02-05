import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import datetime
import uuid

# Robust path logic for Render/Production
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
frontend_folder = os.path.join(BASE_DIR, 'frontend_chat', 'dist')

app = Flask(__name__, static_folder=frontend_folder, static_url_path='')
CORS(app)

# =======================
# DEBUG & DIAGNOSTICS
# =======================

@app.route('/api/debug')
def debug_paths():
    exists = os.path.exists(frontend_folder)
    return jsonify({
        'cwd': os.getcwd(),
        'base_dir': BASE_DIR,
        'frontend_folder': frontend_folder,
        'folder_exists': exists,
        'files_in_dist': os.listdir(frontend_folder) if exists and os.path.isdir(frontend_folder) else "Missing"
    })

@app.route('/')
def serve_index():
    if not os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return """
        <div style="font-family:sans-serif; text-align:center; padding:50px; background:#1a1a1a; color:white; height:100vh;">
            <h1>🚀 Backend is Live!</h1>
            <p>But the Chat UI is still building or not found.</p>
            <div style="background:#333; padding:20px; border-radius:10px; display:inline-block; margin-top:20px;">
                <h3 style="color:#03dac6">Final Deployment Step Needed:</h3>
                <ol style="text-align:left;">
                    <li>Go to your <b>Render Dashboard</b></li>
                    <li>Open <b>Settings</b> for this service</li>
                    <li>Change <b>Environment</b> (Runtime) from 'Python' to <b>'Docker'</b></li>
                    <li>Click <b>Save Changes</b></li>
                </ol>
            </div>
            <p style="margin-top:20px; color:#aaa;">Once you switch to Docker, Render will build the UI automatically.</p>
        </div>
        """, 200
    return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(404)
def not_found(e):
    # This ensures React routing works
    if not os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return debug_paths()
    return send_from_directory(app.static_folder, 'index.html')


users = {
    "vkrishna368.mail.com@gmail.com": {"password": "Vamsi@143", "name": "Vamsi Krishna", "mfa_secret": "123456", "mfa_enabled": True},
    "Saiprakash": {"password": "Sai@123", "name": "Sai Prakash", "mfa_secret": "123456", "mfa_enabled": True},
    "Danarao": {"password": "Dana@123", "name": "Dana Rao", "mfa_secret": "123456", "mfa_enabled": True},
}

# Advanced Channel Structure
# channels = { id: { name, members: [], admin: username, messages: [], typing: {}, is_private: bool } }
channels = {
    1: {
        "name": "General Chat", 
        "messages": [], 
        "typing": {}, 
        "members": list(users.keys()), # Everyone is in General
        "admin": "vkrishna368.mail.com@gmail.com",
        "is_private": False
    }
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

@app.route('/api/chat/channels', methods=['POST'])
def get_channels():
    data = request.json
    session_id = data.get('session_id')
    if not session_id or session_id not in sessions:
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = sessions[session_id]['username']
    # Only return channels where user is a member
    user_channels = []
    for cid, info in channels.items():
        if username in info.get('members', []):
            user_channels.append({
                'id': cid,
                'name': info['name'],
                'is_admin': info.get('admin') == username
            })
    return jsonify({'result': user_channels})

@app.route('/api/chat/create', methods=['POST'])
def create_channel():
    data = request.json
    session_id = data.get('session_id')
    name = data.get('name')
    members = data.get('members', [])
    
    if not session_id or session_id not in sessions:
        return jsonify({'error': 'Unauthorized'}), 401
    
    creator = sessions[session_id]['username']
    if creator not in members:
        members.append(creator)
    
    new_id = max(channels.keys()) + 1
    channels[new_id] = {
        "name": name,
        "messages": [],
        "typing": {},
        "members": members,
        "admin": creator,
        "is_private": True
    }
    return jsonify({'result': {'id': new_id, 'name': name}})

@app.route('/api/chat/delete', methods=['POST'])
def delete_channel():
    data = request.json
    session_id = data.get('session_id')
    channel_id = int(data.get('channel_id'))
    
    if not session_id or session_id not in sessions:
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = sessions[session_id]['username']
    if channels.get(channel_id, {}).get('admin') != username:
        return jsonify({'error': 'Only admins can delete groups'}), 403
    
    channels.pop(channel_id)
    return jsonify({'result': {'status': 'success'}})

@app.route('/api/chat/message/delete', methods=['POST'])
def delete_message():
    data = request.json
    session_id = data.get('session_id')
    channel_id = int(data.get('channel_id'))
    message_id = int(data.get('message_id'))
    
    if not session_id or session_id not in sessions:
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = sessions[session_id]['username']
    name = sessions[session_id]['name']
    
    if channel_id not in channels:
        return jsonify({'error': 'Channel not found'}), 404
    
    # Check if user is author OR admin
    channel = channels[channel_id]
    messages_list = channel['messages']
    
    for i, msg in enumerate(messages_list):
        if msg['id'] == message_id:
            if msg['author'] == name or channel['admin'] == username:
                messages_list.pop(i)
                return jsonify({'result': {'status': 'success'}})
            else:
                return jsonify({'error': 'Unauthorized to delete this message'}), 403
                
    return jsonify({'error': 'Message not found'}), 404

# =======================
# EXISTING CHAT ROUTES (UPDATED)
# =======================

@app.route('/api/chat/join', methods=['POST'])
def chat_join():
    data = request.json
    session_id = data.get('session_id')
    if not session_id or session_id not in sessions:
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Return the first channel the user is a member of (defaults to General)
    username = sessions[session_id]['username']
    for cid, info in channels.items():
        if username in info.get('members', []):
            return jsonify({
                'result': {
                    'channel_id': cid,
                    'name': info['name']
                }
            })
    return jsonify({'error': 'No channels found'}), 404

@app.route('/api/chat/messages', methods=['POST'])
def chat_messages():
    data = request.json
    session_id = data.get('session_id')
    channel_id = int(data.get('channel_id'))
    
    if not session_id or session_id not in sessions:
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = sessions[session_id]['username']
    channel = channels.get(channel_id)
    
    if not channel or username not in channel.get('members', []):
        return jsonify({'error': 'Access denied to this channel'}), 403
    
    msgs = channel.get('messages', [])
    typing_users = channel.get('typing', {})
    
    import time
    current_time = time.time()
    active_typing = [name for name, timestamp in typing_users.items() if current_time - timestamp < 5]
    
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

# =======================
# DAO & GEMINI ROUTES
# =======================

import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dao_module import DAOController
from gemini_agent import GeminiAgent

dao_ctrl = DAOController()
gemini_agent = GeminiAgent()

@app.route('/api/dao/captable', methods=['POST'])
def dao_captable():
    data = request.json
    session_id = data.get('session_id')
    
    if not session_id or session_id not in sessions:
        return jsonify({'error': 'Unauthorized'}), 401
    
    cap_table = dao_ctrl.get_cap_table()
    return jsonify({'result': {'cap_table': cap_table}})

@app.route('/api/dao/award', methods=['POST'])
def dao_award():
    data = request.json
    session_id = data.get('session_id')
    user_name = data.get('user_name')
    amount = data.get('amount')
    reason = data.get('reason')
    
    if not session_id or session_id not in sessions:
        return jsonify({'error': 'Unauthorized'}), 401
        
    # Check Admin (Basic check: only Vamsi is admin for now)
    current_user = sessions[session_id]['username']
    if current_user != "vkrishna368.mail.com@gmail.com":
        return jsonify({'error': 'Only Admin can award points'}), 403
        
    result = dao_ctrl.award_points(current_user, user_name, amount, reason)
    return jsonify({'result': result})

@app.route('/api/dao/summary', methods=['POST'])
def dao_summary():
    # Only Admin or authenticated users
    data = request.json
    session_id = data.get('session_id')
    if not session_id or session_id not in sessions:
        return jsonify({'error': 'Unauthorized'}), 401
        
    ledger = dao_ctrl.get_ledger()
    summary = gemini_agent.summarize_week(ledger)
    
    return jsonify({'result': {'summary': summary}})

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 8069))
    print(f"Starting Friends Chat Room Backend on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
