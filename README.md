# FixMyCampus - Frontend

Plain HTML, CSS, JavaScript and Bootstrap 5. No build step.
It talks to the FixMyCampus backend (Spring Boot) over REST at the address in `js/config.js`.

## Files
```
index.html       landing page + login / create account
dashboard.html   student / staff: my issues and status tracker
report.html      report a new issue (with optional photo)
admin.html       admin: stats, filters, assign department, update status
css/style.css    styles
js/config.js     backend address (default http://localhost:8080)
js/app.js        shared code: login session, API calls, helpers
```

## Run
1. Start the backend first (see the backend README) so http://localhost:8080 is running.
2. Serve this folder on port 5500. Pick one:
   - **VS Code**: install the *Live Server* extension, right-click `index.html`, choose *Open with Live Server*.
   - **Node.js**: `npx serve -l 5500 .`
   - **Python**: `python -m http.server 5500`
3. Open http://localhost:5500

Do not double-click `index.html` to open it as a file: browsers block the API calls from `file://`.

## Using a different port or address
- Frontend on another port: add that address to `app.cors.allowed-origins` in the backend's `application.properties`.
- Backend on another address: edit `js/config.js`.
