import {EvalExpression, codeGen} from './EvalExpression';
import {warn, debug, isEmpty, getDirective} from './helper';
import {Types} from './NodeTypes';
import {Elements} from './Elements';
import {Element} from './Element';
import {VComponent} from './VComponent';
import {
    BLOCK
} from './constant';
const {Program, If, For, Element: ElementType, Expression, Text, Attribute} = Types;


export function createVElement(node, viewContext) {
    const {state} = viewContext;
    switch (node.type) {
    case Text:
        return node.value;

    case Attribute: {
        const {value} = node;
        if (value.type === Expression) {
            const valueEvaluted = EvalExpression(value, viewContext);
            if (valueEvaluted === false) {
                return null;
            }
            return Object.assign({}, node, {
                value: valueEvaluted
            });
        }
        return node;
    }

    case ElementType: {
        const {
            // eslint-disable-next-line
            attributes, directives, children, name
        } = node;
        const {
        // eslint-disable-next-line
            components, directives: thisDirectives, context
        } = viewContext;

        if (name.toLowerCase() === BLOCK) {
            return createVGroup(children, viewContext);
        }

        const attributeList = attributes.map((attribute) => createVElement(attribute, viewContext)).filter(item => item);


        let links = isEmpty(directives)
            ? {}
            : Object.keys(directives).reduce(
                (prev, pattern) => {
                    return Object.assign(prev, {
                        [pattern]: {
                            link: getDirective(pattern, thisDirectives),
                            binding: {
                                context,
                                name: pattern,
                                value: (state = {}) => {
                                    const value = directives[pattern];
                                    if (value.type === Expression) {
                                        return EvalExpression(value, 
                                            Object.assign(viewContext, {
                                                state: Object.assign({}, viewContext.state, state) // merge state into 
                                            }));
                                    }
                                    return value;
                                }
                                    
                            }
                        }
                    });
                },
                {}
            );

        if (Object.keys(components).includes(name)) {
            debug('重新生成组件 virtualdom - ' + name);
            return new VComponent(
                name,
                attributeList,
                createVGroup(children, viewContext),
                links
            ).setConstructor(components[name]);
        }

        return Element.create(
            name,
            attributeList,
            createVGroup(children, viewContext),
            links
        );
    }

    case If: {
        let result;
        if (EvalExpression(node.test, viewContext)) {
            result = createVElement(node.consequent, viewContext);
        } else if (node.alternate) {
            result = createVElement(node.alternate, viewContext);
        }
        return result;
    }

    case For: {
        const elements = Elements.create();
        const list = EvalExpression(node.test, viewContext);
        const {item, index} = node.init;
        const itemName = codeGen(item);
        const indexName = codeGen(index);

        list.forEach(
            (item, index) => {
                elements.push(createVElement(node.body, Object.assign({},
                    viewContext, {
                        state: Object.assign({}, state, {
                            [itemName]: item,
                            [indexName]: index
                        })
                    }
                )));
            }
        );

        return elements;
    }

    case Expression: {
        const result = EvalExpression(node, viewContext);
        if (typeof result !== 'string') {
            return JSON.stringify(result, null, 4);
        }
        return result;
    }

    default:
    }
}

function createVGroup(nodes, viewContext) {
    const elements = Elements.create();

    nodes.forEach((node) => {
        elements.push(createVElement(node, viewContext));
    });

    return elements;
}

export function createVTree(ast, viewContext) {
    // create virtual dom
    const {type, body} = ast;
    if (type === Program) {
        return createVGroup(body, viewContext);
    } else {
        warn('Root element must be Program!');
    }
}