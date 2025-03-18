import React, { useState } from 'react';
import CustomEnvironment from './pages/Home.jsx';
import Zone2 from './pages/zone2.jsx';
import Zone3 from './pages/zone3.jsx';
import Zone4 from './pages/zone4.jsx';

const App = () => {
    const [currentZone, setCurrentZone] = useState('zone1');

    const handleEnterPortal = () => {
        console.log(`Switching from ${currentZone} to ${
            currentZone === 'zone1' ? 'zone2' :
                currentZone === 'zone2' ? 'zone3' :
                    currentZone === 'zone3' ? 'zone4' : 'zone1'
        }`);

        setCurrentZone(prevZone =>
            prevZone === 'zone1' ? 'zone2' :
                prevZone === 'zone2' ? 'zone3' :
                    prevZone === 'zone3' ? 'zone4' : 'zone1'
        );
    };

    return (
        <div className="app-container">
            {currentZone === 'zone1' && (
                <CustomEnvironment glbPath="/src/assets/Stone Age_Revised.glb" hdriPath="src/assets/kloofendal_48d_partly_cloudy_puresky_1k.exr" onPortalEnter={handleEnterPortal} />
            )}
            {currentZone === 'zone2' && (
                <Zone2 glbPath="/src/assets/Medivial_Revised.glb" hdriPath="src/assets/kloofendal_48d_partly_cloudy_puresky_1k.exr" onPortalEnter={handleEnterPortal} />
            )}
            {currentZone === 'zone3' && (
                <Zone3 glbPath="/src/assets/Industrial_Revised.glb" hdriPath="src/assets/kloofendal_48d_partly_cloudy_puresky_1k.exr" onPortalEnter={handleEnterPortal} />
            )}
            {currentZone === 'zone4' && (
                <Zone4 glbPath="/src/assets/Modern_Revised.glb" hdriPath="src/assets/kloofendal_48d_partly_cloudy_puresky_1k.exr" onPortalEnter={handleEnterPortal} />
            )}
        </div>
    );
};

export default App;
