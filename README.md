# sockel

## A TypeScript way of writing WebSocket applications

1. The Message Interface
2. Examples
    1. General Usage
    2. Client

## The Message Interface

A message which is sent from a client
to a server (and vice versa), always has the same format.

```typescript
type Message = { type: string; data?: any };
```

This format has no real restrictions, other than a type having to be defined.

This type is what defines the routing on both client and server side.

## Examples

### General Usage

The following code shows an example

```typescript
import { Client, Server };

// NOTE: All following Message types can have completely arbitrary names,
// they are just named the way they are to better show the functionality
const server = await Server.create();
server.onmessage("SEND_TYPE", async (data: any) => {
    console.log(JSON.stringify({type: "TEST_TYPE", data}));
});

server.onmessage("REQUEST_TYPE", async (data: any) => {
    return { type: "RESPONSE_MESSAGE", data: {}}
});

// Following code can also be pasted into a typescript based browser client
const client = await Client.connect("localhost:3000");

// Sending a message without await a message as a response
client.send({type: "TEST_TYPE", data: {}})

// Sending a message and await a response message from the server
const response = await client.request({ type: "REQUEST_TYPE", data: {} })
```

### Client

Creating a client with sockel can be achieved with the following lines of code.

#### connect - Connecting to the server

<br/>

```typescript
import { Client } from "sockel";

const client = await Client.connect("localhost:3000");
```

First thing to notice that you can await the connection call, meaning you don't have to write any code for
the onopen/onconnection event. This is a choice made to provide an async await way of writing sockel code.

<br/>

#### send - Sending a Message to the server

After awaiting the connection, you can instantly start to send a Message to the server.

The send function accepts an object with a type (for identifying the Message on the server) and an arbitrary data
. For more information on the message format see [Message formatting](Message formatting).

```typescript
client.send({ type: "TEST_TYPE", data: {} });
```

<br/>

#### request - Sending a Message and waiting for a response Message

Sockel provides a way to send a Message and then await a Message as a response (comparable to a POST request).

```typescript
const response: Message = await client.request({ type: "TEST_TYPE", data: {} });
```

The interface for the request method is the same as the send method.
The difference lies in the underlying request, appending the information that the client awaits a response message from the server.
