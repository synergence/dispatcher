# Dispatcher
A multi-purpose dispatcher for easy cross-boundary and internal communication. This is, from an external point of view, fully typesafe! Internally it's quite garbage but it works..

## Installation
You can install this using npm or any package manager of your choice. Simply run `npm i @rbxts/dispatcher`

## Setup
You will need a file that defines your operations. It can be placed anywhere, though it's recommended to be placed in ReplicatedStorage so warnings don't appear. An example is as follows:

```ts
// remoteData.d.ts (/shared/remoteData.d.ts)

export type DefinedServerOperations = {
    serverOperation(text: string): void;
}

export type DefinedClientOperations = {
    clientOperation(text: string): void;
}

export type DefinedServerEvents = {
    serverEvent(text: string): void;
}

export type DefinedServerFunctions = {
    serverFunction(text: string): boolean;
}
```

Then, you'll need to create dispatchers for the server and client, as you can't require cross-boundaries.

```ts
// serverDispatcher.ts (/server/ServerDispatcher.ts)
import { BaseServerDispatcher } from '@rbxts/dispatcher';
import { DefinedClientOperations, DefinedServerEvents, DefinedServerFunctions, DefinedServerOperations } from 'shared/remoteData';

export const serverDispatcher = new BaseServerDispatcher<
    DefinedServerOperations,
    DefinedClientOperations,
    DefinedServerEvents,
    DefinedServerFunctions
>();
```

```ts
// clientDispatcher.ts (/client/clientDispatcher.ts)
import { BaseClientDispatcher } from '@rbxts/dispatcher';
import { DefinedClientOperations, DefinedServerEvents, DefinedServerFunctions } from 'shared/remoteData';

export const clientDispatcher = new BaseClientDispatcher<
    DefinedClientOperations,
    DefinedServerEvents,
    DefinedServerFunctions
>();
```

## Server Usage
```ts
import { serverDispatcher } from 'server/serverDispatcher';

// Listen to a server event
serverDispatcher.on('serverEvent', text => {
    print(text);
});

// Handle a server function
serverDispatcher.on('serverFunction', text => {
    print(text);

    return true;
});

// Handle a server dispatch
serverDispatcher.listen('serverOperation', text => {
    print(text);
});

// Fire a client event
serverDispatcher.emit('clientOperation', 'Hello world!');

// Dispatch a event for the server
serverDispatcher.dispatch('serverOperation', 'Hello world!');
```

## Client Usage
```ts
import { clientDispatcher } from 'client/clientDispatcher';

// Listen to a client operation
clientDispatcher.on('clientOperation', text => {
    print(text);
});

// Dispatch a client operation
clientDispatcher.dispatch('clientOperation', 'Hello world!');

// Invoke a server event
clientDispatcher.emit('serverEvent', 'Hello world!');

// Invoke a server function
const result = clientDispatcher.invoke('serverFunction', 'Hello world!');
```