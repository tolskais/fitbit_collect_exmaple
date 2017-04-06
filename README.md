# Set Environment

## create .env file in root path, and fill in contents like below
- FITBIT_CLIENT_ID=copy from your application profile in dev.fitbit.com
- FITBIT_PRIVATE=copy from your application profile in dev.fitbit.com
- IP=localhost (this should be the same with redirect_url in your application profile)
- PORT=4000 (this should be the same with redirect_url in your application profile)

## Application Profile
In the application profile in dev.fitbit.com, set redirect_url as http://${IP}:${PORT}/fitbit

# Generate oauth tokens

```
    > node server.js
```

Open the browser and access http://${IP}:${PORT}/, then log in with your fitbit account which you want to collect data.
If all is completed, <user_id>.json is created in the root path.


# Collect data
In config.lib.js and config.task.js, you can create your own function to handle data from fitbit.
As an example, index.js load token from 3DKZH7. change it with your user_id and execute command in the shell

```
    > node index.js --from=2017-04-04 --until=2017-04-20
```

You can collect heartrate, steps from 2017-04-04 to 2017-04-20.

Good luck and if you need more information, check dev.fitbit.com.
