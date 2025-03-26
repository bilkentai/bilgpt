# BilGPT - Bilkent AI Society's WhatsApp Bot

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/bilkentai/bilgpt/releases)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js)](https://nodejs.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT-412991?logo=openai)](https://openai.com/)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-API-25D366?logo=whatsapp)](https://www.whatsapp.com/)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-brightgreen.svg)](https://github.com/bilkentai/bilgpt/graphs/commit-activity)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/bilkentai/bilgpt/pulls)

> **Want to contribute?** We'd love to have you on board! Please contact us at [bilkentai@gmail.com](mailto:bilkentai@gmail.com) before making any contributions.

<div align="center">
  <img src="assets/bilgpt-logo.png" alt="BilGPT Logo" width="50%">
</div>

BilGPT is an intelligent WhatsApp bot developed by Bilkent AI Society that combines AI-powered chat capabilities with content analysis. It serves as a versatile assistant for the Bilkent AI Society community, offering both conversational AI interactions and insightful content analysis.

## About Bilkent AI Society

Bilkent AI Society is a dynamic community at Bilkent University that brings together students passionate about artificial intelligence. In our first year, we've achieved remarkable milestones including:

- Hosting distinguished guests from leading tech companies, including OpenAI, Microsoft, NVIDIA, Meta, Google, and more!  
- Being accepted into NVIDIA's AI Student Network and Notion Student Organizations.  
- Achieving first place in Amazon's project competition.  
- Organizing a huge event with Global Turks AI, inviting 13 alumni from top companies and institutions.  
- Contributing to global AI initiatives, such as Cohere For AI's Aya project.  
- Organizing major events, including Bilkent Philfest'23.

**Learn more:** [ais.bilkent.edu.tr](https://ais.bilkent.edu.tr)

**Join our group:** [bilkentai.com](https://bilkentai.com)

## Features

### 🤖 AI Chat
- Engage in meaningful discussions with AI on any topic
- Get context-aware responses when mentioning or replying to the bot
- Experience natural conversation flow with memory of chat history
- Receive well-reasoned arguments and explanations

### 🔍 URL Analysis
- Share any URL and get AI-powered analysis of its content
- Receive detailed criticism and insights about the shared resources
- Understand different perspectives and potential biases
- Get structured summaries of articles and web content

### 👑 Admin Features
- Monitor and manage group activities through admin commands
- Control bot's presence in different groups with ease
- Access debug information and system status for maintenance
- Manage group permissions and bot behavior

## Technologies Used

- **WhatsApp API**: whatsapp-web.js for WhatsApp integration
- **AI/ML**: OpenAI client for AI models for chat and content analysis
- **Runtime**: Node.js
- **Storage**: JSON-based persistent storage
- **Testing**: Jest for unit testing
- **Code Quality**: ESLint for code linting
- **Version Control**: Git
- **Package Management**: npm

## Project Structure

The project is organized using a modular architecture:

```
├── src/                      # Source code directory
│   ├── index.js              # Main entry point
│   ├── ai/                   # AI functionality
│   │   ├── chatbot.js        # AI chat response module
│   │   └── critic.js         # URL content analysis module
│   ├── config/               # Configuration
│   │   └── env.js            # Environment configuration
│   ├── handlers/             # Message and command handlers
│   │   ├── adminHandler.js   # Admin command handling
│   │   └── messageHandler.js # Message processing
│   ├── prompts/              # System prompts for AI
│   │   ├── ai_bot_prompt.md  # System prompt for chat
│   │   └── critic_prompt.md  # System prompt for URL analysis
│   ├── services/             # Business logic and services
│   │   ├── debugService.js   # Debug utilities
│   │   ├── groupManager.js   # Group management functionality
│   │   └── groupStorage.js   # Persistent storage for groups
│   ├── tests/                # Test files
│   └── utils/                # Utilities
│       ├── clientUtils.js    # WhatsApp client management
│       └── healthCheck.js    # Health check endpoint
├── data/                     # Persistent data storage
│   └── active-groups.json    # Stored active group IDs
├── critics/                  # Saved criticism data
├── assets/                   # Static assets
│   └── bilgpt-logo.png      # Project logo
└── README.md                 # Project documentation
```

## Module Descriptions

### AI Modules
- **ai/chatbot.js**: Provides AI chat responses with proper conversation context and memory
- **ai/critic.js**: Analyzes URLs and provides AI criticism with structured insights

### Configuration
- **config/env.js**: Centralizes environment variables and application configuration

### Handlers
- **handlers/adminHandler.js**: Manages admin commands, permissions, and group controls
- **handlers/messageHandler.js**: Processes incoming messages, handles URL analysis, and manages chat interactions

### Prompts
- **prompts/ai_bot_prompt.md**: System prompt for the AI chat functionality, defining personality and behavior
- **prompts/critic_prompt.md**: System prompt for URL analysis, setting analysis criteria and output format

### Services
- **services/debugService.js**: Provides debugging utilities and logging functionality
- **services/groupManager.js**: Handles group chat operations, monitoring, and management
- **services/groupStorage.js**: Provides persistent storage for active groups and settings

### Tests
- Contains comprehensive test files for various components
- Includes unit tests, integration tests, and API tests

### Utilities
- **utils/clientUtils.js**: Handles WhatsApp client creation, setup, and graceful shutdown
- **utils/healthCheck.js**: Provides health check endpoints for monitoring system status

### Main Application
- **index.js**: Ties everything together, initializes the application, and manages the main bot lifecycle

## Configuration

Configuration is done through environment variables in a `.env` file:

```
ADMIN_NUMBER=1234567890
OPENAI_API_KEY=your-openai-api-key
```

## Usage

1. Clone the repository
2. Install dependencies with `npm install`
3. Copy `.env.example` to `.env` and add your configuration
4. Start the bot with `npm start`
5. Scan the QR code with WhatsApp

## Admin Commands

The following commands are available for admin users:

- `/list` - List all available chats
- `/debug` - Show detailed debug information
- `/setactive <id>` - Set a group to be actively monitored
- `/removeactive <id>` - Remove a group from active monitoring
- `/active` - Show currently monitored groups
- `/reset` - Reset admin chat ID (use with caution)

## Contributing

We welcome contributions from the Bilkent AI Society community and beyond. Please feel free to submit pull requests or open issues for any improvements or bug fixes.

## Contributors

#### Core Contributors:

- [Yavuz Alp Sencer Öztürk](https://github.com/alpsencer) ([@alpsencer](https://github.com/alpsencer))
- [Eray Yapağcı](https://github.com/erayyap) ([@erayyap](https://github.com/erayyap))

<div align="center">
  <a href="https://github.com/bilkentai/bilgpt/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=bilkentai/bilgpt" alt="Contributors" />
  </a>
</div>

Made with [contrib.rocks](https://contrib.rocks).

## License

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

The GNU Affero General Public License is a free, copyleft license for software and other kinds of works, specifically designed to ensure cooperation with the community in the case of network server software.

### Usage Restrictions
- This project is for non-commercial use only
- Any commercial use, including but not limited to:
  - Using the bot for profit-making purposes
  - Integrating the bot into commercial services
  - Using the bot in a business context
  is strictly prohibited without explicit written permission from Bilkent AI Society.

## Follow Us

<div align="center">

[![Instagram](https://img.shields.io/badge/Instagram-@bilkentai-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://instagram.com/bilkentai)
[![Twitter](https://img.shields.io/badge/Twitter-@bilkentai-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://twitter.com/bilkentai)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-@bilkentai-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/company/bilkentai)
[![YouTube](https://img.shields.io/badge/YouTube-@bilkentai-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/@bilkentai)

</div>

## Contact

For questions or support, please reach out to the Bilkent AI Society team:
- Email: [bilkentai@gmail.com](mailto:bilkentai@gmail.com)
