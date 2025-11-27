# Finance Tracker

A modern, self-hosted personal and small-business finance tracking application. Built with a React.js frontend and a Spring Boot backend, it helps you take control of your income and expenses with a clean, intuitive interface.

<img width="1677" height="926" alt="Screenshot 2025-11-27 at 6 19 29 PM" src="https://github.com/user-attachments/assets/48539327-664d-43bb-93ad-388ebc0c8910" />


## Features

*   **Dashboard Overview:** Get a quick visual summary of your financial health with charts and statistics
*   **Income & Expense Tracking:** Easily add, edit, and categorize your daily transactions
*   **Secure Authentication:** JWT-based login and registration to keep your financial data private
*   **RESTful API:** A robust and well-documented backend API for all financial operations
*   **Docker Support:** Easy deployment using Docker and Docker Compose
*   **Responsive Design:** Works seamlessly on desktop and mobile devices

## Who is this for?

### Individuals
Perfect for anyone who wants to move beyond spreadsheets and have full control over their personal financial data in a private, self-hosted solution.

### Small to Mid-sized Businesses (SMBs)
Ideal for:
* **Freelancers & Consultants** tracking business expenses and income
* **Startups** needing a simple internal tool for cash flow management
* **Family-run businesses** monitoring operational costs
* **Small teams** that need expense tracking without enterprise software complexity

**Cost Benefit:** Save thousands on expensive SaaS subscriptions by self-hosting this free, open-source alternative.

## Quick Start (Using Docker)

This is the easiest way to run the application.

### Prerequisites
*   Docker
*   Docker Compose

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/AvijitDas229/finance-tracker.git
    cd finance-tracker
    ```

2.  Run with Docker Compose:
    ```bash
    docker-compose up -d
    ```

3.  Access the application:
    *   **Frontend:** http://localhost:3000
    *   **Backend API:** http://localhost:8080
    *   **Default credentials:** (Register a new account through the frontend)

The application will start with a default H2 in-memory database. **For production use with persistent data, see our [Detailed Installation Guide](docs/installation.md).**

## Documentation

*   [Detailed Installation and Configuration](docs/installation.md)
*   [API Reference](docs/api.md)
*   [Developer Guide](docs/development.md)
*   [Contributing Guidelines](CONTRIBUTING.md)

## Contributing

We love your input! We want to make contributing to Finance Tracker as easy and transparent as possible. Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

Before contributing, you'll need to sign our Contributor License Agreement (CLA).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Support

*   📧 **Email:** [your-email@example.com]
*   🐛 **Bug Reports:** [GitHub Issues](https://github.com/AvijitDas229/finance-tracker/issues)
*   💬 **Discussions:** [GitHub Discussions](https://github.com/AvijitDas229/finance-tracker/discussions)

## Project Link

[https://github.com/AvijitDas229/finance-tracker](https://github.com/AvijitDas229/finance-tracker)
