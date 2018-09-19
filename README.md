space-cleaner
=

Description
==
> space-cleaner is a tool which is used for cleaning files which are not linked with your database. It checks what files you have on your database then it checks what files you have on your server. It compares both and performs action on the resultant files. It'll help you to save storage on your server.

Installation
==

    npm install space-cleaner
    
Pull Requests
==

 > You're welcome to add improvements to the package. Please mention what and why you have made the changes as now a days i'm not into magic so it will be a little difficult for me to understand it :p.
 
Usage (Basic)
==
 
```javascript
  var cleaner = require('space-cleaner');
  cleaner.action('./public', 'move-with-log', { dbName: 'test', dbUrl: 'mongodb://localhost:27017', models: { 'user': ['profilePic','profilePicCompressed','userFile'], 'message': ['file'] } } );
  
  /*
  * './public' -> location where your files are stored
  * 'move-with-log' or 'hard-delete' -> move-with-log will move the files deleted to a new folder 'filesCleaner'. Another option is 'hard-delete' it'll delete the files permanently from the server.
  * { dbName: 'test', dbUrl: 'mongodb://localhost:27017', models: { 'user': ['profilePic','profilePicCompressed','userFile'], 'messages': ['file'] } } -> You'll pass db config over here. 'user' && 'messages' are the collection name over here. 'profilePic', 'profilePicCompressed', 'userFile', 'file' are the document field names.
  */
```

Extra Parameters
==

```javascript
  var cleaner = require('space-cleaner');
  cleaner.action('./public', 'move-with-log', { dbName: 'test', dbUrl: 'mongodb://localhost:27017', models: { 'user': ['profilePic','profilePicCompressed','userFile'], 'message': ['file'] } }, { cron: 5000, files: { exclude:['jpg'] } } );
  
  /*
  * cron and files can be passed as extra paramaters.
  * cron by default value is false. Time passed inside cron will be in milliseconds
  * inside files, exclude and include can be passed. only one will be taken in account.
  * if both exclude and include are passed then only include will work.
  * exclude/include will exclude/include all the file extensions which matches with those given inside.
  */
```
