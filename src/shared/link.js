// link element or Component as vElement
import {uid} from './helper';

export default function link(node, element) {
    const {links} = element;
    const ondestroy = Object.keys(links).map(
        (name) =>  {
            const {link, binding} = links[name];
            return link(node, binding, element);
        }
    );

    element.ondestroy = () => {
        ondestroy.forEach(item => item());
    };

    element.ondestroy.id = uid();
}