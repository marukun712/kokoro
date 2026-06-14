import type { SpriteNode } from "../image/psd";

export interface Group {
	/** グループに含まれるノード一覧 */
	nodes: SpriteNode[];
	/** 全ノードの X 座標 */
	x: number;
	/** 全ノードの Y 座標 */
	y: number;
	/** 全ノードのアルファ値 */
	alpha: number;
	/** 全ノードの表示状態 */
	visible: boolean;
	/** 全ノードの X スケール */
	scaleX: number;
	/** 全ノードの Y スケール */
	scaleY: number;
}

export type Matchable = { name: string; path: string[] };

export type GroupMatcher = (node: Matchable) => boolean;

export function groupNodes(nodes: SpriteNode[], matcher: GroupMatcher): Group {
	const matched = nodes.filter(matcher);
	const containers = matched.map((n) => n.container);

	return {
		nodes: matched,
		get x() {
			return containers[0]?.x ?? 0;
		},
		set x(v) {
			containers.forEach((c) => {
				c.x = v;
			});
		},
		get y() {
			return containers[0]?.y ?? 0;
		},
		set y(v) {
			containers.forEach((c) => {
				c.y = v;
			});
		},
		get alpha() {
			return containers[0]?.alpha ?? 1;
		},
		set alpha(v) {
			containers.forEach((c) => {
				c.alpha = v;
			});
		},
		get visible() {
			return containers[0]?.visible ?? true;
		},
		set visible(v) {
			containers.forEach((c) => {
				c.visible = v;
			});
		},
		get scaleX() {
			return containers[0]?.scale.x ?? 1;
		},
		set scaleX(v) {
			containers.forEach((c) => {
				c.scale.x = v;
			});
		},
		get scaleY() {
			return containers[0]?.scale.y ?? 1;
		},
		set scaleY(v) {
			containers.forEach((c) => {
				c.scale.y = v;
			});
		},
	};
}

export function byName(name: string): GroupMatcher {
	return (n) => n.name === name;
}

export function byPath(path: string[]): GroupMatcher {
	return (n) =>
		path.every((seg, i) => n.path[n.path.length - path.length + i] === seg);
}

export function psdGroup(groupName: string, negative?: string[]): GroupMatcher {
	return (n) =>
		n.path.includes(groupName) &&
		!negative?.some((neg) => n.path.includes(neg));
}

export function or(...matchers: GroupMatcher[]): GroupMatcher {
	return (n) => matchers.some((m) => m(n));
}
