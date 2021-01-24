import { BaseDispatcher, OperationMap } from 'baseDispatcher';

const ReplicatedStorage = game.GetService('ReplicatedStorage');

/**
 * Base dispatcher for the client. Note that you will need to require this at least once on the client for it to work.
 * @example
 * // remoteData.d.ts (/shared/remoteData.d.ts)
 * 
 * export type DefinedServerOperations = {
 *     serverOperation(text: string): void;
 * }
 * 
 * export type DefinedClientOperations = {
 *     clientOperation(text: string): void;
 * }
 * 
 * export type DefinedServerEvents = {
 *     serverEvent(text: string): void;
 * }
 * 
 * export type DefinedServerFunctions = {
 *     serverFunction(text: string): boolean;
 * }
 * 
 * // clientDispatcher.ts (/client/clientDispatcher.ts)
 * import { BaseClientDispatcher } from 'rbxts/dispatcher';
 * import { DefinedClientOperations, DefinedServerEvents, DefinedServerFunctions } from 'shared/remoteData';
 * 
 * export const clientDispatcher = new BaseClientDispatcher<
 *     DefinedClientOperations,
 *     DefinedServerEvents,
 *     DefinedServerFunctions
 * >();
 * 
 * // To use the dispatcher..
 * import { clientDispatcher } from 'client/clientDispatcher';
 * 
 * // Listen to a client operation
 * clientDispatcher.on('clientOperation', text => {
 *     print(text);
 * });
 * 
 * // Dispatch a client operation
 * clientDispatcher.dispatch('clientOperation', 'Hello world!');
 * 
 * // Invoke a server event
 * clientDispatcher.emit('serverEvent', 'Hello world!');
 * 
 * // Invoke a server function
 * const result = clientDispatcher.invoke('serverFunction', 'Hello world!');
 */
export class BaseClientDispatcher<
	ClientOperations extends OperationMap,
	ServerEvents extends OperationMap,
	ServerFunctions extends OperationMap
> extends BaseDispatcher<ClientOperations> {
	private remoteEvent: RemoteEvent;
	private remoteFunction: RemoteFunction;

	constructor() {
		super();

		this.remoteEvent = ReplicatedStorage.WaitForChild('DispatcherEvent') as RemoteEvent;
		this.remoteEvent.OnClientEvent.Connect((boundEvent, ...args) => {
			this.handleEvent(boundEvent as keyof ClientOperations, ...args as Array<unknown>)
		});

		this.remoteFunction = ReplicatedStorage.WaitForChild('DispatcherFunction') as RemoteFunction;
	}

	/**
	 * Internally handle the event sent from the remote for processing
	 * @param handle The name of the event
	 * @param args The arguments of the event
	 */
	private handleEvent<Handle extends keyof ClientOperations>(handle: Handle, ...args: Array<unknown>) {
		//@ts-ignore
		this.dispatch(handle, ...args);
	}

	/**
	 * Emit an event for the server to handle
	 * @param handle The handle of the event
	 * @param args The arguments of the event
	 */
	public emit<Handle extends keyof ServerEvents>(handle: Handle, ...args: Parameters<ServerEvents[Handle]>) {
		this.remoteEvent.FireServer(handle, ...args as Array<unknown>);
	}

	/**
	 * Invoke a function for the server to handle
	 * @param handle The handle of the event
	 * @param args The arguments of the event
	 */
	public invoke<Handle extends keyof ServerFunctions>(handle: Handle, ...args: Parameters<ServerFunctions[Handle]>): ReturnType<ServerFunctions[Handle]> {
		return this.remoteFunction.InvokeServer(handle, ...args as Array<unknown>);
	}
}