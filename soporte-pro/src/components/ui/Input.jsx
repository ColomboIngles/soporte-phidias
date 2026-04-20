export default function Input(props) {
    return (
        <input
            {...props}
            className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
    );
}