/**

 * @param {Object} props
 * @param {string} props.message 
 * @param {boolean} props.fullScreen 
 */
export default function LoadingState({ message = 'Loading...', fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-700">{message}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-3"></div>
      <p className="text-gray-700">{message}</p>
    </div>
  );
}