# Poco
Postgres Copy Tool

Proposed design and high-level architecture for your **Postgres-only** data-copying admin tool. 

---

## 1. Overall Architecture

1. **Frontend**  
   - **Material UI** design for a clean, responsive interface.  
   - A minimal Single Page Application (SPA) or multi-page setup using a modern JavaScript framework (React or Vue), if you are comfortable integrating with Flask. Material UI is primarily a React component library, so using React + Material UI is typical.  
   - Alternatively, if you prefer server-side templating with Flask, you can still incorporate Material Design principles with CSS/JS but won’t use the React-specific Material UI library.  

2. **Backend**  
   - **Python Flask** application.  
   - All database operations (list schemas, list tables, get row counts, copy/backup/restore) happen via Python code that connects to Postgres.  
   - RESTful or AJAX endpoints that your front-end calls to:
     - Retrieve schemas/tables/relationships
     - Perform copy operations
     - Trigger backups and restores
     - Provide real-time or periodic status updates

3. **Storage of Connection URIs**  
   - Use a `.env` file to store connection URIs (for each environment: dev, QA, prod, etc.).  
   - Potentially allow the user to add or remove new “cards” at runtime. The tool can write updates to `.env` or maintain a small JSON file that is also referenced from `.env`.  

---

## 2. Database “Card” UI Layout

Each **database card** (for dev, QA, prod, etc.) will have:

1. **Label + URI**  
   - A text field for label (e.g., “Dev” or “QA”).  
   - A text field for the Postgres URI (including user/password/host/port/DB name).  
   - A default “schema” field (set to `"public"` by default).

2. **Connect Button**  
   - On click, it calls a Flask endpoint to:
     1. Validate the connection.  
     2. Retrieve a list of tables in the specified schema.  
     3. For each table, get the row count.  
     4. Retrieve relationships (FK constraints) so we know how tables reference each other.

3. **Expandable List of Tables**  
   - Each table can be expanded to show columns if desired.  
   - The row count is displayed at the table level.  
   - A checkbox next to each table for selection.  
   - A “Select All” checkbox to quickly select or deselect all tables.  
   - **Relationship awareness**: If Table A is selected, and it has required references (FK relationships), the UI automatically checks the associated table(s). The user can uncheck them, but the default should be to select all dependent tables.

4. **Backup / Restore / Overwrite**  
   - Below the table list, three checkboxes or toggles:
     1. **Overwrite Data** (on copy)  
     2. **Back Up Data** (before copy)  
     3. **Restore Data** (from previously saved .sql files)  

   You might refine these into separate actions or combined workflows:
   - **Backup**: “Dump” the connected DB’s “public” schema to a local `.sql` file with a timestamp & label in the filename (e.g. `backup_Dev_20230517_1200.sql`).  
   - **Restore**: Prompt the user to select one of the backups from a local list (or a file chooser) and restore it.  
   - **Overwrite**: For copying table data from **Source** to **Target**, if Overwrite is checked, the system handles table truncation or drop+recreate in the correct dependency order.

5. **Add/Remove DB Card**  
   - A floating “plus” button (as you sketched) on the right side to add a new card.  
   - Possibly a small “trash” or “x” icon to remove an existing card from the UI.  
   - Write these changes to your `.env` or a local config file so they persist.

6. **Copy Direction**  
   - The user selects which card is the **source** and which is the **target** (e.g., a toggle or arrow that can flip direction).  
   - Alternatively, the UI can have a “source” radio button on each card and a “target” radio button, so you can pick any two cards.  
   - Once selected, the user chooses which tables to copy and hits **Copy**.

---

## 3. Workflow Examples

### A. Copy Data From Dev to QA

1. **Add/Configure DB Cards**: Dev Card, QA Card, both connected.  
2. **Select Dev Card as Source**; select QA Card as Target.  
3. **Check** which tables to copy (or “Select All”).  
4. **Check Overwrite** if you want existing data in QA to be replaced.  
5. Optionally **Back Up** the QA DB first.  
6. Hit “Copy.”  
7. The system:
   - (Optional) performs a backup of QA DB to a local `.sql` file.  
   - Figures out table dependency order (via foreign keys), truncates or drops existing QA tables in correct sequence.  
   - Copies data from Dev to QA.  
   - Updates the UI with real-time or periodic progress (e.g., copying table 1 of 10, 2 of 10, etc.).

### B. Back Up Dev Database

1. **Click** on Dev Card.  
2. **Click** “Backup DB” button.  
3. Flask runs `pg_dump` behind the scenes.  
4. The `.sql` file is saved with a descriptive timestamp.  
5. Logs and status appear in a small console/log area in the UI.

### C. Restore Production from a Backup

1. **Click** on Production Card.  
2. **Expand** the backup/restore options.  
3. **Choose** from a list of previously saved `.sql` backups or upload your own.  
4. **Click** “Restore.”  
5. Flask runs `psql -f backup_Prod_20230517_1200.sql` to restore.  
6. The UI shows logs/status updates.

---

## 4. Handling Relationships & Overwrites

1. **Detecting Relationships**  
   - Use Postgres’s information schema or `pg_catalog` tables to detect foreign keys.  
   - For each selected table, also select any referencing or referenced tables automatically.  
   - Show the user a pop-up or highlight that certain other tables were auto-selected.

2. **Overwriting Data**  
   - **Order of deletion**: Before copying, you may need to disable or drop foreign key constraints, or you do a topological sort on the tables so that child tables are truncated first, then parent tables.  
   - **Order of insertion**: Insert data into parent tables first, then child tables.  
   - Optionally re-enable constraints at the end (if you disabled them).  
   - Provide a “sanity check” confirmation step with a summary of how many tables/rows will be overwritten.

---

## 5. Logging & Status Updates

1. **Application Logs**  
   - Log all major events to a file, e.g. `app.log`:  
     - DB connections, backup/restore actions, copy attempts.  
     - Which user (if relevant in the future) or which environment triggered it.  
   
2. **Database Operation Logs**  
   - Detailed logs for each copy operation: which tables were truncated, how many rows inserted, etc.  
   - Store them in a separate log or the same `app.log`.

3. **Progress Feedback**  
   - The front-end can poll a Flask endpoint or use WebSockets (if desired) to display dynamic progress: e.g. “Copying table 2 of 10: 300 rows inserted.”  
   - If using polling, each copy job can have a job ID. The UI requests the job’s status every few seconds until completion or failure.

---

## 6. Tech Stack Details

1. **Python Flask**  
   - Endpoints for:  
     - `/api/connect` – verifies URI, pulls tables, columns, row counts, relationships.  
     - `/api/copy` – triggers a background job to copy data from source to target.  
     - `/api/backup` – triggers `pg_dump`.  
     - `/api/restore` – triggers `psql -f ...`.  
     - `/api/status/<job_id>` – returns progress info for an in-flight operation.  
   - Use `psycopg2` or `asyncpg` (if going async with something like Quart) for queries.  
   - Potentially use the Python `subprocess` module to run `pg_dump` and `psql` for backups/restores.

2. **Frontend**  
   - **React** with **Material UI** for the layout and styling:
     - Each DB Card is a `Card` or `Paper` component.  
     - Collapsible table lists with `Accordion` components.  
     - Checkboxes from the Material UI library.  
   - A top-level “Copy Direction” control or toggle.  
   - A small console-like area for logging or a dialog that pops up with logs.  
   - If the user wants real-time updates, an approach with either:
     - **Polling**: The front-end calls `/api/status/<job_id>` periodically.  
     - **WebSockets**: A more advanced approach for real-time streaming logs.

3. **Local Storage of URIs**  
   - The `.env` file can have key-value pairs for each environment:
     ```env
     DEV_DB_URI=postgresql://user:pass@host:5432/dev_db
     QA_DB_URI=postgresql://user:pass@host:5432/qa_db
     ```
   - If you want dynamic additions, you can maintain a small JSON file that gets updated at runtime (the front-end calls an endpoint to persist new connections). On startup, the Flask app reads from that JSON (and from `.env` for secrets if needed).

---

## 7. Handling Edge Cases

1. **Invalid Connection**  
   - If the user enters a bad URI or the DB is unreachable, show an error toast/snackbar in the UI.  
2. **Large Tables**  
   - If a table has thousands of rows, the copy might take a minute or more. Provide progress updates.  
3. **Schema Mismatch**  
   - If somehow the target DB has a table missing or a different schema, the tool will detect it and prompt the user to confirm they want to proceed or create the missing table(s).  
4. **Disk Space for Backups**  
   - Ensure the server running Flask has enough disk space for `.sql` dumps. Possibly let the user set a limit or a cleanup policy.  

---

## 8. Putting It All Together

A typical user flow in the final tool might look like this:

1. **Open the web interface** served by Flask.  
2. **See** multiple DB cards (Dev, QA, Prod) if they exist or add them.  
3. **Connect** each card to load tables & relationships.  
4. **Select** source and target.  
5. **Choose** which tables to copy or “Select All.”  
6. **Check** “Backup target DB before copy” if desired.  
7. **Check** “Overwrite” if you need to replace data on target.  
8. **Click** “Copy” and watch the progress bar and logs.  

When done, you’ll have a local log, a potential backup file, and the target DB updated with fresh data from the source.

---

### In Summary
- A **Flask** back-end for connecting to Postgres, orchestrating copies, backups, and restores.  
- A **React + Material UI** front-end (most common approach for using Material UI) that displays DB cards, schema/tables, and provides checkboxes/expandable lists.  
- Full-table copying only, with a “public” schema default, plus an automatic check of dependencies so that related tables are selected or handled in the correct order.  
- Local `.sql` backups with the naming convention of `(db_label)_(timestamp).sql` or similar.  
- Real-time or near real-time status updates for copy jobs, plus logs in a console or dedicated section of the UI.
