import { ClassOperationMap, BaseDispatcher, OperationMap, OperationIdArray, OperationExternalIdentifier } from 'baseDispatcher';

const ReplicatedStorage = game.GetService('ReplicatedStorage');

/**
 * Convert an array to a similar sized array of unknown
 */
export type UnknownArray<T extends Array<any>> = {[K in keyof T]: unknown};

/**
 * Maps the parameters within a function to include the player and the unsanitized arguments
 */
export type ServerParameterMapper<T extends Array<any>> = [Player, ...UnknownArray<T>];

/**
 * Converts an operation map to an unknown operation map for use within the server dispatcher
 */
export type UnknownOperationMap<T extends OperationMap> = {[K in keyof T]: (...args: ServerParameterMapper<Parameters<T[K]>>) => ReturnType<T[K]>};

/**
 * Base dispatcher for the server. Note that you will need to require this at least once on the server for it to work.
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
 * // serverDispatcher.ts (/server/ServerDispatcher.ts)
 * import { BaseServerDispatcher } from '@rbxts/dispatcher';
 * import { DefinedClientOperations, DefinedServerEvents, DefinedServerFunctions, DefinedServerOperations } from 'shared/remoteData';
 * 
 * export const serverDispatcher = new BaseServerDispatcher<
 *     DefinedServerOperations,
 *     DefinedClientOperations,
 *     DefinedServerEvents,
 *     DefinedServerFunctions
 * >();
 * 
 * // To use the dispatcher..
 * import { serverDispatcher } from 'server/serverDispatcher';
 * 
 * // Listen to a server event
 * serverDispatcher.on('serverEvent', text => {
 *     print(text);
 * });
 * 
 * // Handle a server function
 * serverDispatcher.on('serverFunction', text => {
 *     print(text);
 * 
 *     return true;
 * });
 * 
 * // Handle a server dispatch
 * serverDispatcher.listen('serverOperation', text => {
 *     print(text);
 * });
 * 
 * // Fire a client event
 * serverDispatcher.emit('clientOperation', 'Hello world!');
 * 
 * // Dispatch a event for the server
 * serverDispatcher.dispatch('serverOperation', 'Hello world!');
 */
export class BaseServerDispatcher<
	ServerOperations extends OperationMap,
	ClientOperations extends OperationMap,
	ServerEvents extends OperationMap,
	ServerFunctions extends OperationMap
> extends BaseDispatcher<ServerOperations> {
	private remoteEvent: RemoteEvent;
	private remoteFunction: RemoteFunction;

	constructor() {
		super();

		this.remoteEvent = new Instance('RemoteEvent');
		this.remoteEvent.Name = 'DispatcherEvent';
		this.remoteEvent.Parent = ReplicatedStorage;
		this.remoteEvent.OnServerEvent.Connect((player, boundEvent, ...args: Array<unknown>) => this.onEvent(player, boundEvent, ...args));
		
		this.remoteFunction = new Instance('RemoteFunction');
		this.remoteFunction.Name = 'DispatcherFunction';
		this.remoteFunction.Parent = ReplicatedStorage;
		this.remoteFunction.OnServerInvoke = (player, boundEvent, ...args: Array<unknown>) => this.onFunction(player, boundEvent, ...args);
	}

	protected incomingEvents: ClassOperationMap<UnknownOperationMap<ServerEvents>> = {};
	protected incomingFunctions: {[K in keyof ServerFunctions]?: UnknownOperationMap<ServerFunctions>[K]} = {};

	/**
	 * Verify that a remote exists and the client is not trying to invoke an invalid event
	 * @param key The key of the remote
	 * @param table The table to check in
	 */
	private verifyRemoteExistance<T>(key: unknown, table: T): key is keyof T {
		if (!typeIs(key, 'string')) return false;
		if (!(key in table)) return false;
		
		return true;
	}

	/**
	 * Emit an event for the client to handle
	 * @param player The player to emit to
	 * @param handle The handle of the event
	 * @param args The arguments of the event
	 */
	public emit<Handle extends keyof ClientOperations>(player: Player, handle: Handle, ...args: Parameters<ClientOperations[Handle]>) {
		this.remoteEvent.FireClient(player, handle, ...args as Array<unknown>);
	}

	/**
	 * Broadcast an event for all clients to handle
	 * @param handle The handle of the event
	 * @param args The arguments of the event
	 */
	public broadcast<Handle extends keyof ClientOperations>(handle: Handle, ...args: Parameters<ClientOperations[Handle]>) {
		this.remoteEvent.FireAllClients(handle, ...args as Array<unknown>);
	}

	/**
	 * Internally transform the event for type safety for use in the next handler
	 * @param player The player that sent the event
	 * @param boundHandle The handle of the event
	 * @param args The arguments of the event
	 */
	private onEvent(player: Player, boundHandle: unknown, ...args: Array<unknown>) {
		if (!this.verifyRemoteExistance(boundHandle, this.incomingEvents)) {
			warn(`${player.Name} tried to fire a non-existant event!`);
			return;
		}

		this.handleEvent(player, boundHandle, ...args);
	}

	/**
	 * Internally handle the event sent from the remote for processing
	 * @param player The player that sent the event
	 * @param handle The handle of the event
	 * @param args The arguments of the event
	 */
	private handleEvent<Handle extends keyof ServerEvents>(player: Player, handle: Handle, ...args: Array<unknown>) {
		const incomingEvents = this.incomingEvents[handle] as OperationIdArray<UnknownOperationMap<ServerEvents>, Handle> | undefined;
		
		if (incomingEvents) {
			for (const [, handler] of incomingEvents) {
				//@ts-ignore
				handler(player, ...args);
			}
		}
	}

	/**
	 * Internally transform the function for type safety for use in the next handler
	 * @param player The player that sent the function
	 * @param boundHandle The handle of the function
	 * @param args The arguments of the function
	 */
	private onFunction(player: Player, boundHandle: unknown, ...args: Array<unknown>) {
		if (!this.verifyRemoteExistance(boundHandle, this.incomingFunctions)) {
			warn(`${player.Name} tried to fire a non-existant function!`);
			return;
		}

		return this.handleFunction(player, boundHandle, ...args);
	}

	/**
	 * Internally handle the function sent from the remote for processing
	 * @param player The player that sent the function
	 * @param handle The handle of the function
	 * @param args The arguments of the function
	 */
	private handleFunction<Handle extends keyof ServerFunctions>(player: Player, handle: Handle, ...args: Array<unknown>): ReturnType<ServerFunctions[Handle]> {
		const handler = this.incomingFunctions[handle] as ServerFunctions[Handle];

		//@ts-ignore
		return handler(player, ...args);
	}

	/**
	 * Handle an event sent by the client. Calling this function twice for the same handle will add the last one to the queue.
	 * @param handle The handle of the event
	 * @param handler The handler of the vent
	 */
	public on<Handle extends keyof ServerEvents>(handle: Handle, handler: UnknownOperationMap<ServerEvents>[Handle]): OperationExternalIdentifier<UnknownOperationMap<ServerEvents>> {
		this.verbosePrint(`Bound EVNT: "${handle}"`);
		return this.bindListen<Handle, UnknownOperationMap<ServerEvents>>(handle, this.incomingEvents, handler);
	}

	/**
	 * Handle a function sent by the client. Calling this function twice for the same handle will override the previous handle.
	 * @param handle The handle of the function
	 * @param handler The handler of the invoked function
	 */
	public handle<Handle extends keyof ServerFunctions>(handle: Handle, handler: UnknownOperationMap<ServerFunctions>[Handle]) {
		this.verbosePrint(`Bound FUNC: "${handle}"`);
		this.incomingFunctions[handle] = handler;
	}
}