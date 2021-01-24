const RunService = game.GetService('RunService');

/**
 * The type that gives structure to all the functions within the various dispatchers
 */
export type OperationMap = Record<string, Callback>;

/**
 * A callback for the dispatcher
 */
export type OperationIdArray<Operations extends OperationMap, key extends keyof Operations> = Map<number, Operations[key]>;
/**
 * The class-level mapper for handlers and operations
 */
export type ClassOperationMap<Operations extends OperationMap> = {[key in keyof Operations]?: OperationIdArray<Operations, key>};

/**
 * The external identifier for the bound operations
 */
export interface OperationExternalIdentifier<Operations extends OperationMap> {
	group: ClassOperationMap<Operations>;
	handle: keyof Operations;
	id: number;
} 

/**
 * The base dispatcher to be extended off of
 */
export class BaseDispatcher<Operations extends OperationMap> {
	/**
	 * Internal tracking number to keep track of all bound events and allow for unbinding them
	 */
	protected caseNumber = 0;

	/**
	 * The main operations map
	 */
	protected boundOperations: ClassOperationMap<Operations> = {};
	/**
	 * The operations map to fire after all operations have concluded in the main operations map
	 */
	protected boundPostOperations: ClassOperationMap<Operations> = {};

	/**
	 * If the dispatcher is verbose
	 */
	public verbose = RunService.IsStudio();
	
	/**
	 * Construct a dispatcher
	 */
	constructor() {
		this.verbosePrint('Finished initialization');
	}

	/**
	 * Prints a message if the dispatcher's mode is set to verbose
	 * @param message The message to print
	 */
	public verbosePrint(...message: Array<string>) {
		if (!this.verbose) return;

		print('DISPATCHER:', ...message);
	}

	/**
	 * Dispatch an event and trigger all the bound functions
	 * @param handle The handle of the event
	 * @param args The arguments of the event
	 */
	public dispatch<Handle extends keyof Operations>(handle: Handle, ...args: Parameters<Operations[Handle]>) {
		const dispatchQueue = this.boundOperations[handle] as OperationIdArray<Operations, Handle> | undefined;
		const postDispatchQueue = this.boundPostOperations[handle] as OperationIdArray<Operations, Handle> | undefined;

		this.verbosePrint(`Queued "${handle}" with ${dispatchQueue ? dispatchQueue.size() : 0}${postDispatchQueue ? ` (+${postDispatchQueue.size()})` : ''} bound.`);

		if (dispatchQueue) {
			for (const [, handler] of pairs(dispatchQueue)) {
				handler(...args as Array<unknown>);
			}
		}

		if (postDispatchQueue) {
			for (const [, handler] of pairs(postDispatchQueue)) {
				handler(...args as Array<unknown>);
			}
		}
	}

	/**
	 * INTERNAL USE ONLY: Bind an operation to an arbitrary operation list.
	 * @param handle The handle of the operation
	 * @param operations The operations list to put the operation into
	 * @param handler The handler of the operation
	 */
	protected bindListen<Handle extends keyof T, T extends OperationMap = Operations>(handle: Handle, operations: ClassOperationMap<T>, handler: T[Handle]): OperationExternalIdentifier<T> {
		const caseNumber = this.caseNumber++;

		let boundOperations = operations[handle];
		
		if (!boundOperations) {
			boundOperations = new Map();
			operations[handle] = boundOperations;
		}

		boundOperations.set(caseNumber, handler);

		return {
			group: operations,
			handle: handle,
			id: caseNumber
		};
	}

	/**
	 * Listen for dispatch events and handle accordingly
	 * @param handle The handle of the operation
	 * @param handler The handler to handle the invokation of the operation
	 */
	public listen<Handle extends keyof Operations>(handle: Handle, handler: Operations[Handle]): OperationExternalIdentifier<Operations> {
		this.verbosePrint(`Bound "${handle}"`);
		return this.bindListen(handle, this.boundOperations, handler);
	}

	/**
	 * Listen for dispatch events and handle accordingly, after the operation has finished
	 * @param handle The handle of the operation
	 * @param handler The handler to handle the invokation of the operation
	 */
	public listenPost<Handle extends keyof Operations>(handle: Handle, handler: Operations[Handle]): OperationExternalIdentifier<Operations> {
		this.verbosePrint(`Bound "${handle}" to post`);
		return this.bindListen(handle, this.boundPostOperations, handler);
	}

	/**
	 * Unbind an operation and prevent it from triggering again
	 * @param operationIdentifier The operation's identifier
	 */
	public unbind(operationIdentifier: OperationExternalIdentifier<Operations>) {
		const searchingMap = operationIdentifier.group[operationIdentifier.handle] as OperationIdArray<Operations, typeof operationIdentifier['handle']>;
		return searchingMap.delete(operationIdentifier.id);
	}
}