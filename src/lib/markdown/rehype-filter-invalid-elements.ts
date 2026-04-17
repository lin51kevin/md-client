import { visit } from 'unist-util-visit';

/** Strip hast elements whose tag names are not valid HTML identifiers (e.g. '300-306'). */
export const rehypeFilterInvalidElements = () => (tree: any) => {
  visit(tree, 'element', (node: any, index: number | undefined, parent: any) => {
    if (
      typeof node.tagName === 'string' &&
      !/^[a-zA-Z][a-zA-Z0-9-]*$/.test(node.tagName)
    ) {
      if (parent && index !== undefined) {
        parent.children.splice(index, 1, ...(node.children ?? []));
        return index;
      }
    }
  });
};
