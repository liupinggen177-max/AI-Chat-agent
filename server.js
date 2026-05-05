const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let agentConfigs = {
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

app.post('/api/chat', async (req, res) => {
  try {
    const { message, agentId = 'default', history = [], apiUrl, apiKey, model } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
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

    const messages = [
      { role: 'system', content: agent.systemPrompt },
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
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
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
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
  const { id } = req.params;

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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
