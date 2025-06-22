async function testBlockPersistence() {
  console.log('🧪 Testing block persistence...');

  // Dynamic import for node-fetch
  const { default: fetch } = await import('node-fetch');

  const shareToken = 'vmm672ddxog8p6z0lb45ng'; // Use your current share token

  try {
    // 1. Load current project data
    console.log('📥 Loading current project data...');
    const loadResponse = await fetch(
      `http://localhost:8080/api/collaborative/project/${shareToken}`,
    );
    const loadData = await loadResponse.json();
    console.log('📥 Current project data:', loadData);

    // 2. Create a test block
    const testBlock = {
      nodeDataArray: [
        {
          id: Math.floor(Date.now() + Math.random() * 1000),
          type: 'messageBlock',
          text: 'Test message block',
          loc: { x: 200, y: 200 },
        },
      ],
      linkDataArray: [],
    };

    console.log('💾 Saving test block:', testBlock);

    // 3. Save the test block
    const saveResponse = await fetch(
      `http://localhost:8080/api/collaborative/project/${shareToken}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testBlock),
      },
    );

    if (saveResponse.ok) {
      const saveResult = await saveResponse.json();
      console.log('✅ Save successful:', saveResult);

      // 4. Load the project again to verify persistence
      console.log('📥 Loading project data after save...');
      const verifyResponse = await fetch(
        `http://localhost:8080/api/collaborative/project/${shareToken}`,
      );
      const verifyData = await verifyResponse.json();
      console.log('📥 Project data after save:', verifyData);

      // 5. Check if the block was saved
      const savedNodes = verifyData.data?.nodeDataArray || [];
      const testBlockFound = savedNodes.some(
        (node) =>
          node.type === 'messageBlock' && node.text === 'Test message block',
      );

      if (testBlockFound) {
        console.log('✅ Test block was successfully saved and persisted!');
      } else {
        console.log('❌ Test block was not found after save');
      }
    } else {
      const errorText = await saveResponse.text();
      console.error('❌ Save failed:', saveResponse.status, errorText);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testBlockPersistence();
