const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const AGENTS_FILE = path.join(__dirname, 'agents.json');
const SESSIONS_FILE = path.join(__dirname, 'sessions.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function loadAgentConfigs() {
  try {
    if (fs.existsSync(AGENTS_FILE)) {
      const data = fs.readFileSync(AGENTS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed.default) {
        console.log('Agents config loaded from file');
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load agents config:', err);
  }
  return {
    default: {
      id: 'default',
      name: 'Assistant',
      description: 'Default AI assistant',
      systemPrompt: 'You are a helpful AI assistant.',
      apiUrl: '',
      apiKey: '',
      model: 'gpt-3.5-turbo'
    }
  };
}

function saveAgentConfigs(configs) {
  try {
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(configs, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save agents config:', err);
  }
}

function loadSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      console.log('Sessions loaded from file');
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load sessions:', err);
  }
  return [];
}

function saveSessions(sessions) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save sessions:', err);
  }
}

let agentConfigs = loadAgentConfigs();
let sessions = loadSessions();

app.post('/api/chat', async (req, res) => {
  try {
    const { message, agentId = 'default', history = [], apiUrl, apiKey, model, files = [] } = req.body;

    if (!message && files.length === 0) {
      return res.status(400).json({ error: 'Message or files are required' });
    }

    let agent = agentConfigs[agentId] || agentConfigs.default;
    
    const useApiUrl = apiUrl || agent.apiUrl;
    const useApiKey = apiKey || agent.apiKey;
    const useModel = model || agent.model;

    if (!useApiUrl || !useApiKey) {
      return res.status(400).json({ error: 'API not configured for this agent' });
    }

    if (!useModel) {
      return res.status(400).json({ error: 'Model not configured for this agent' });
    }

    const historyMessages = history.map(msg => {
      let content = msg.content;
      if (msg.agentId && msg.role === 'assistant') {
        const agentName = agentConfigs[msg.agentId]?.name || msg.agentId;
        const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
        content = `[${agentName}${timeStr ? ` @ ${timeStr}` : ''}] ${msg.content}`;
      } else if (msg.role === 'user') {
        const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
        content = `[User${timeStr ? ` @ ${timeStr}` : ''}] ${msg.content}`;
      }
      return {
        role: msg.role,
        content: content
      };
    });

    let userContent = message || '';
    if (files.length > 0) {
      const fileInfo = files.map(f => `File: ${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ');
      if (userContent) {
        userContent = `${userContent}\n\nAttached files: ${fileInfo}`;
      } else {
        userContent = `Files attached: ${fileInfo}`;
      }
    }

    const messages = [
      { role: 'system', content: agent.systemPrompt },
      ...historyMessages,
      { role: 'user', content: userContent }
    ];

    const response = await fetch(`${useApiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${useApiKey}`
      },
      body: JSON.stringify({
        model: useModel,
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        const text = await response.text();
        throw new Error(`API request failed: ${text.substring(0, 200)}`);
      }
      throw new Error(errorData.error?.message || 'API request failed');
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || '';

    res.json({
      success: true,
      message: assistantMessage,
      agent: { name: agent.name }
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get response'
    });
  }
});

app.get('/api/agents', (req, res) => {
  res.json({
    success: true,
    agents: agentConfigs
  });
});

app.post('/api/agents', (req, res) => {
  try {
    const { id, name, description, systemPrompt, apiUrl, apiKey, model } = req.body;

    if (!id || !name || !systemPrompt) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID, name, and system prompt are required'
      });
    }

    agentConfigs[id] = {
      id,
      name,
      description: description || '',
      systemPrompt,
      apiUrl: apiUrl || '',
      apiKey: apiKey || '',
      model: model || 'gpt-3.5-turbo'
    };

    saveAgentConfigs(agentConfigs);

    res.json({
      success: true,
      agent: agentConfigs[id]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/agents/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, systemPrompt, apiUrl, apiKey, model } = req.body;

    if (!agentConfigs[id]) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    agentConfigs[id] = {
      ...agentConfigs[id],
      name: name || agentConfigs[id].name,
      description: description !== undefined ? description : agentConfigs[id].description,
      systemPrompt: systemPrompt || agentConfigs[id].systemPrompt,
      apiUrl: apiUrl !== undefined ? apiUrl : agentConfigs[id].apiUrl,
      apiKey: apiKey !== undefined ? apiKey : agentConfigs[id].apiKey,
      model: model !== undefined ? model : agentConfigs[id].model
    };

    saveAgentConfigs(agentConfigs);

    res.json({
      success: true,
      agent: agentConfigs[id]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/agents/:id', (req, res) => {
  const id = decodeURIComponent(req.params.id);

  if (id === 'default') {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete default agent'
    });
  }

  if (!agentConfigs[id]) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }

  delete agentConfigs[id];
  saveAgentConfigs(agentConfigs);
  res.json({ success: true });
});

app.post('/api/models', async (req, res) => {
  try {
    const { apiUrl, apiKey } = req.body;

    if (!apiUrl || !apiKey) {
      return res.status(400).json({ error: 'API URL and Key are required' });
    }

    const modelEndpoints = [
      '/v1/models',
      '/v1/provider/models',
      '/v1/available_models',
      '/models'
    ];

    let models = [];
    let lastError = null;
    let rawResponse = null;

    for (const endpoint of modelEndpoints) {
      try {
        console.log(`Trying models endpoint: ${apiUrl}${endpoint}`);
        const response = await fetch(`${apiUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });

        const responseText = await response.text();
        console.log(`Response status: ${response.status}, preview: ${responseText.substring(0, 200)}`);

        if (response.ok) {
          try {
            const data = JSON.parse(responseText);
            console.log('Parsed data:', JSON.stringify(data, null, 2).substring(0, 500));

            if (Array.isArray(data)) {
              models = data.map(m => typeof m === 'object' ? (m.id || m.name || JSON.stringify(m)) : m);
              console.log('Extracted models:', models);
              break;
            } else if (data.data && Array.isArray(data.data)) {
              models = data.data.map(m => m.id || m.name || m);
              console.log('Extracted models:', models);
              break;
            } else if (data.models && Array.isArray(data.models)) {
              models = data.models.map(m => m.id || m.name || m);
              console.log('Extracted models:', models);
              break;
            } else if (data.object === 'list' && data.data) {
              models = data.data.map(m => m.id);
              console.log('Extracted models:', models);
              break;
            } else if (typeof data === 'object') {
              const possibleArrays = Object.values(data).filter(v => Array.isArray(v));
              if (possibleArrays.length > 0) {
                models = possibleArrays[0].map(m => typeof m === 'object' ? (m.id || m.name || JSON.stringify(m)) : m);
                console.log('Extracted models:', models);
                break;
              }
            }
          } catch (parseErr) {
            console.log(`JSON parse error for ${endpoint}:`, parseErr.message);
            lastError = `Invalid JSON response from ${endpoint}`;
            rawResponse = responseText.substring(0, 200);
          }
        } else {
          console.log(`Endpoint ${endpoint} failed with status ${response.status}: ${responseText.substring(0, 100)}`);
          lastError = `Status ${response.status}: ${responseText.substring(0, 100)}`;
          rawResponse = responseText.substring(0, 200);
        }
      } catch (err) {
        console.log(`Endpoint ${endpoint} error:`, err.message);
        lastError = err.message;
      }
    }

    console.log('Final models to return:', models);
    if (models.length > 0) {
      res.json({
        success: true,
        models: models
      });
    } else {
      res.status(400).json({
        success: false,
        error: lastError || 'No models endpoint available',
        raw: rawResponse
      });
    }

  } catch (error) {
    console.error('Models fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch models'
    });
  }
});

app.get('/api/sessions', (req, res) => {
  res.json({
    success: true,
    sessions: sessions
  });
});

app.post('/api/sessions', (req, res) => {
  try {
    const { session } = req.body;
    if (!session) {
      return res.status(400).json({ success: false, error: 'Session is required' });
    }

    const existingIndex = sessions.findIndex(s => s.id === session.id);
    if (existingIndex > -1) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

    saveSessions(sessions);
    res.json({ success: true, session });
  } catch (error) {
    console.error('Save session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/sessions/:id', (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const initialLength = sessions.length;
  sessions = sessions.filter(s => s.id !== id);

  if (sessions.length < initialLength) {
    saveSessions(sessions);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: 'Session not found' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
