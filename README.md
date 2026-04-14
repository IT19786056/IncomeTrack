# CashFlow: Personal Income & Expense Tracker

A streamlined, local-first application designed to track multiple income streams and daily expenses without the clutter of traditional banking apps. Built for developers and freelancers who need a clear view of their net position.

## Core Features

* **Multi-Source Income Tracking:** Log earnings from salary, freelance projects, and side hustles with custom categorization.
* **Granular Expense Logging:** Tag expenses by project, personal needs, or business overhead.
* **SQL-Backed Data:** Robust data persistence with optimized queries for monthly summaries.
* **Dashboard Visuals:** Clean overview of monthly burn rates and savings margins.
* **Export Options:** Quick export to CSV for tax season or deeper analysis.

## Tech Stack

* **Backend:** Node.js / Express
* **Database:** Firebase
* **Frontend:** React with a focus on responsive, mobile-first design
* **State Management:** Redux Toolkit

## Getting Started

### Prerequisites

* Node.js (v18.x or higher)
* SQL Server Management Studio (for database setup)
* NPM or Yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/username/cashflow-tracker.git
    cd cashflow-tracker
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Database Configuration:**
    Create a `.env` file in the root directory and add your connection string:
    ```env
    DB_CONNECTION_STRING=Server=localhost;Database=CashFlowDB;User Id=your_user;Password=your_password;
    ```

4.  **Run Migrations:**
    Execute the provided SQL scripts in the `/db/scripts` folder to initialize the schema and triggers.

5.  **Launch the App:**
    ```bash
    npm run dev
    ```

## Project Structure

* `/src/api`: Express routes and controller logic.
* `/src/db`: SQL queries, stored procedures, and triggers.
* `/src/ui`: React components and styling.
* `/docs`: API documentation and database schema diagrams.

## Key Queries

This app utilizes optimized SQL triggers to automatically update "Net Balance" tables whenever a new income or expense entry is logged, ensuring the dashboard remains snappy even with thousands of entries.

## Roadmap

* [ ] Integration with bank APIs for automated syncing.
* [ ] Dark mode UI overhaul.
* [ ] Mobile application (React Native).

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---
*Created for personal financial management and technical growth.*
