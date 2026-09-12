How to visit: Can be ran locally via 'npm start' or loaded from the website URL'https://smash-fighter-picker.onrender.com/'

How it works: 

server.js: hosts the site via a Render connection URl and stores the function/query for grabbing fighter data from a Neon database

index.html: shows fighter attributes with short descriptions and complementary videos with more detail. Each attribute can be marked as 'Mandatory', 'Preferred', and 'Ignore' to signify their weight in the search algorithm

app.js: Handles dynamic video loading for the multi select attributes, collects the users responses, and calculates the best fighter options, and then sends the results to results.html

results.html: Displays the fighter(s) that best match the users requests with all their attributes listed (requested attributes being highlighted)
